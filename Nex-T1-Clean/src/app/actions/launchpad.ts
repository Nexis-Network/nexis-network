"use server";

import { createClient } from "@/server/services/supabase/server";
import { revalidatePath } from "next/cache";
import { Address } from "viem";
import { createHash } from "crypto";

import { AgentWizardData } from "@/components/launchpad/agent-wizard/store";
import { generateCharacterConfig } from "@/lib/eliza-os/character-generator";
import { calculateSafeAddress } from "@/modules/wallets/nex/safe-account";
import { ensureActiveOrg } from "@/server/organization/active-org";
import { logger } from "@/lib/logger";

/**
 * Server action for the legacy agent wizard flow.
 * Writes to the production "agent" table with a corresponding "agent_version" row.
 */
export async function createAgentAction(data: AgentWizardData, ownerAddress: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase client initialization failed");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Resolve the active org for the current user
  const orgResolution = await ensureActiveOrg({ cookieSource: undefined });
  const orgId = orgResolution?.ok ? orgResolution.orgId : null;
  if (!orgId) {
    throw new Error("No active organization found. Please select or create an organization first.");
  }

  // Generate ElizaOS character config
  const characterConfig = generateCharacterConfig(data);

  // Derive a URL-safe slug from the agent name
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || `agent-${Date.now()}`;

  // Optionally compute a Safe address for the agent
  let safeAddress: string | null = null;
  try {
    const salt = BigInt(Date.now());
    safeAddress = await calculateSafeAddress({
      ownerAddress: ownerAddress as Address,
      chainId: 8453,
      salt,
    });
  } catch (e) {
    logger.error("Failed to calculate Safe address", e);
    // Non-fatal: agent proceeds as draft without a computed Safe address
  }

  // Insert into the production "agent" table
  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .insert({
      org_id: orgId,
      owner_user_id: user.id,
      slug,
      name: data.name,
      description: data.bio || null,
      system_prompt: data.systemPrompt || null,
      visibility: "private",
    })
    .select("id, org_id, owner_user_id, slug, name, description, system_prompt, visibility, created_at")
    .single();

  if (agentError) {
    logger.error("Agent insert failed", agentError);
    throw new Error("Failed to create agent record");
  }

  // Insert agent_version with the full character config
  const versionConfig = {
    ...characterConfig,
    ticker: data.ticker,
    initialBuyAmount: data.initialBuyAmount,
    antiSniperMode: data.antiSniperMode,
    safeAddress,
  };
  const checksum = `sha256:${createHash("sha256").update(JSON.stringify(versionConfig)).digest("hex")}`;

  const { error: versionError } = await supabase
    .from("agent_version")
    .insert({
      org_id: orgId,
      agent_id: agent.id,
      config: versionConfig,
      checksum,
    });

  if (versionError) {
    logger.error("Agent version insert failed", versionError);
    throw new Error("Failed to create agent version record");
  }

  revalidatePath("/launchpad/dashboard");
  return { success: true, agentId: agent.id };
}
