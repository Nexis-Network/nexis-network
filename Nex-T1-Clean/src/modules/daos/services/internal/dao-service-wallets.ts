import { daoChainBindingSchema } from "@/modules/daos/contracts";
import type { SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";
import {
  DaoServiceError,
  parseRow,
} from "./dao-service-utils";

export async function resolveUserEvmExecutionWallet(options: {
  service: SupabaseServiceRoleClient;
  userId: string;
  chainId: number;
}): Promise<string | null> {
  const { data, error } = await options.service
    .from("wallet_accounts")
    .select("address")
    .eq("user_id", options.userId)
    .eq("chain_id", options.chainId)
    .eq("platform", "evm")
    .in("wallet_type", ["cdp", "eoa"])
    .eq("status", "ready")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_EVM_USER_WALLET_LOOKUP_FAILED",
    });
  }

  return typeof data?.address === "string" && data.address.trim().length > 0
    ? data.address.trim()
    : null;
}

export async function resolveAgentEvmExecutionWallet(options: {
  service: SupabaseServiceRoleClient;
  userId: string;
  chainId: number;
  agentId: string;
}): Promise<string | null> {
  const { data, error } = await options.service
    .from("agent_wallets")
    .select("address,agent:agent!inner(owner_user_id)")
    .eq("agent.owner_user_id", options.userId)
    .eq("agent_id", options.agentId)
    .eq("chain_id", options.chainId)
    .eq("platform", "evm")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_EVM_AGENT_WALLET_LOOKUP_FAILED",
    });
  }

  return typeof data?.address === "string" && data.address.trim().length > 0
    ? data.address.trim()
    : null;
}

export async function resolveEvmExecutionWallet(options: {
  service: SupabaseServiceRoleClient;
  userId: string;
  chainId: number;
  ownershipMode: "user" | "agent" | "hybrid";
  linkedAgentId?: string | null;
  preferredAgentId?: string | null;
}): Promise<{ address: string; source: "user" | "agent"; agentId: string | null }> {
  const requestedAgentId = options.preferredAgentId ?? options.linkedAgentId ?? null;

  if (options.ownershipMode === "agent" && requestedAgentId) {
    const agentWallet = await resolveAgentEvmExecutionWallet({
      service: options.service,
      userId: options.userId,
      chainId: options.chainId,
      agentId: requestedAgentId,
    });
    if (agentWallet) {
      return {
        address: agentWallet,
        source: "agent",
        agentId: requestedAgentId,
      };
    }
  }

  const userWallet = await resolveUserEvmExecutionWallet({
    service: options.service,
    userId: options.userId,
    chainId: options.chainId,
  });

  if (userWallet) {
    return {
      address: userWallet,
      source: "user",
      agentId: null,
    };
  }

  if (requestedAgentId) {
    const agentWallet = await resolveAgentEvmExecutionWallet({
      service: options.service,
      userId: options.userId,
      chainId: options.chainId,
      agentId: requestedAgentId,
    });
    if (agentWallet) {
      return {
        address: agentWallet,
        source: "agent",
        agentId: requestedAgentId,
      };
    }
  }

  throw new DaoServiceError("No EVM execution wallet is ready for this DAO action", {
    status: 400,
    code: "DAO_EVM_EXECUTION_WALLET_REQUIRED",
  });
}

export async function loadPrimaryEvmChainBinding(options: {
  service: SupabaseServiceRoleClient;
  daoId: string;
  orgId: string;
}) {
  const { data, error } = await options.service
    .from("dao_chain_bindings")
    .select("*")
    .eq("dao_id", options.daoId)
    .eq("org_id", options.orgId)
    .eq("chain_family", "evm")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DaoServiceError(error.message, {
      status: 400,
      code: "DAO_EVM_CHAIN_BINDING_LOOKUP_FAILED",
    });
  }

  return data
    ? parseRow(daoChainBindingSchema, data, "dao_chain_binding")
    : null;
}

