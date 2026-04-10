/**
 * Langfuse Prompt Sync Script (Source of Truth)
 *
 * Domain: Scripts
 * Responsibility: Syncs runtime prompts + metaprompt templates to Langfuse using the v2 Prompts API.
 * Notes: Run with `pnpm exec tsx scripts/sync-prompts-to-langfuse.ts`
 *
 * Required env:
 * - LANGFUSE_PUBLIC_KEY
 * - LANGFUSE_SECRET_KEY
 * Optional env:
 * - LANGFUSE_BASEURL (or legacy LANGFUSE_BASE_URL)
 * - LANGFUSE_PROMPT_LABEL (default: "production")
 */

import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createHash } from "crypto";
import { Langfuse, type ApiPrompt } from "langfuse";

import {
  CHATBOT_ARTIFACT_MANIFEST,
  CHATBOT_NATURAL_LANGUAGE_HINT,
  CHATBOT_TOOL_BUDGET_PROMPT,
  CHATBOT_TOOL_INTENT_GUIDE,
} from "../src/modules/ai/chatbot/constants";
import { BLOCKSCOUT_TOOL_GUIDE } from "../src/modules/ai/chatbot/blockscout-tools";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_DEEP, SYSTEM_PROMPT_MINIMAL } from "../src/modules/ai/system-prompt";
import {
  ARTIFACT_USAGE_GUIDE,
  DOCUMENT_CANVAS_GUIDE,
  FINAL_ANSWER_SPEC,
  NEX_PERSONA,
  TOOL_PLANNING_SPEC,
  USER_UPDATES_SPEC,
  VERBOSITY_SPEC,
} from "../src/modules/ai/metaprompts";

const LANGFUSE_LABEL = (process.env.LANGFUSE_PROMPT_LABEL ?? "production").trim() || "production";
const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASEURL ?? process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com";

const CACHE_SAFETY_PROMPT = `When deciding the "cacheable" flag in the structured response, set it to true only if the answer contains strictly public information, no attachment-derived content, and no personalized summaries. Otherwise, set it to false.`;

type PromptDefinition = {
  name: string;
  content: string;
  tags: string[];
  config?: Record<string, unknown>;
};

const GPT54_PROMPT_CONFIG = {
  source: "repo",
  targetModel: "openai/gpt-5.4",
} as const;

const PROMPTS: PromptDefinition[] = [
  // Runtime prompts (fetched by PromptFactory)
  {
    name: "nex.runtime.system",
    content: SYSTEM_PROMPT,
    tags: ["runtime", "system", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "base_system_prompt" },
  },
  {
    name: "nex.runtime.system_fast",
    content: SYSTEM_PROMPT_MINIMAL,
    tags: ["runtime", "system", "fast", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "fast_system_prompt" },
  },
  {
    name: "nex.runtime.system_deep",
    content: SYSTEM_PROMPT_DEEP,
    tags: ["runtime", "system", "deep", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "deep_system_prompt" },
  },
  {
    name: "nex.runtime.tool_intent_guide",
    content: CHATBOT_TOOL_INTENT_GUIDE,
    tags: ["runtime", "tools", "guide", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "tool_intent_guide" },
  },
  {
    name: "nex.runtime.artifact_manifest",
    content: CHATBOT_ARTIFACT_MANIFEST,
    tags: ["runtime", "artifacts", "guide", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "artifact_manifest" },
  },
  {
    name: "nex.runtime.tool_budget",
    content: CHATBOT_TOOL_BUDGET_PROMPT,
    tags: ["runtime", "tools", "budget", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "tool_budget" },
  },
  {
    name: "nex.runtime.natural_language_hint",
    content: CHATBOT_NATURAL_LANGUAGE_HINT,
    tags: ["runtime", "style", "tools", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "style_hint" },
  },
  {
    name: "nex.runtime.cache_safety",
    content: CACHE_SAFETY_PROMPT,
    tags: ["runtime", "cache", "safety", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "cache_safety" },
  },
  {
    name: "nex.runtime.blockscout_guide",
    content: BLOCKSCOUT_TOOL_GUIDE,
    tags: ["runtime", "tools", "blockscout", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "blockscout_tool_guide" },
  },

  // Metaprompt templates (fetched and injected by PromptFactory)
  {
    name: "nex.meta.persona",
    content: NEX_PERSONA,
    tags: ["metaprompt", "persona", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "persona" },
  },
  {
    name: "nex.meta.verbosity",
    content: VERBOSITY_SPEC,
    tags: ["metaprompt", "verbosity", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "verbosity" },
  },
  {
    name: "nex.meta.tool_planning",
    content: TOOL_PLANNING_SPEC,
    tags: ["metaprompt", "tools", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "tool_planning" },
  },
  {
    name: "nex.meta.user_updates",
    content: USER_UPDATES_SPEC,
    tags: ["metaprompt", "updates", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "user_updates" },
  },
  {
    name: "nex.meta.final_answer",
    content: FINAL_ANSWER_SPEC,
    tags: ["metaprompt", "formatting", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "final_answer_formatting" },
  },
  {
    name: "nex.meta.artifact_guide",
    content: ARTIFACT_USAGE_GUIDE,
    tags: ["metaprompt", "artifacts", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "artifact_usage" },
  },
  {
    name: "nex.meta.document_canvas_guide",
    content: DOCUMENT_CANVAS_GUIDE,
    tags: ["metaprompt", "document-canvas", "gpt-5.4"],
    config: { ...GPT54_PROMPT_CONFIG, purpose: "document_canvas_guide" },
  },
];

const LEGACY_PROMPT_NAMES = [
  "system-prompt",
  "chatbot-tool-intent-guide",
  "chatbot-artifact-manifest",
  "chatbot-tool-budget-prompt",
  "chatbot-natural-language-hint",
  "cache-safety-prompt",
  "nex-persona",
  "nex-verbosity-spec",
  "nex-tool-planning",
  "nex-user-updates",
  "nex-final-answer",
  "nex-artifact-guide",
  "nex-document-canvas-guide",
] as const;

const shouldSunsetLegacyPrompts = ["true", "1", "yes"].includes(
  String(process.env.LANGFUSE_SUNSET_LEGACY_PROMPTS ?? "")
    .trim()
    .toLowerCase(),
);

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function promptToText(prompt: ApiPrompt): string {
  if (prompt.type === "text") return prompt.prompt;
  return (prompt.prompt as unknown[]).map((m) => `${m.role}: ${m.content}`).join("\n");
}

const RESERVED_LABELS = new Set(["latest"]);

function labelsForUpdate(labels: string[]): string[] {
  return labels.filter((label) => !RESERVED_LABELS.has(label));
}

function isNotFound(err: unknown): boolean {
  const anyErr = err as { status?: number; response?: { status?: number }; message?: string };
  return anyErr?.status === 404 || anyErr?.response?.status === 404 || Boolean(anyErr?.message?.includes("404"));
}

async function getPromptForLabel(langfuse: Langfuse, name: string): Promise<ApiPrompt | null> {
  try {
    return await langfuse.api.promptsGet({ promptName: name, label: LANGFUSE_LABEL });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

async function upsertPrompt(langfuse: Langfuse, def: PromptDefinition): Promise<{
  status: "created" | "updated" | "skipped";
  version: number | null;
  previousVersion: number | null;
}> {
  const existing = await getPromptForLabel(langfuse, def.name);
  const existingText = existing ? promptToText(existing) : null;

  if (existingText && hash(existingText) === hash(def.content)) {
    return { status: "skipped", version: existing?.version ?? null, previousVersion: existing?.version ?? null };
  }

  const commitMessage = `sync:${LANGFUSE_LABEL}:${new Date().toISOString()}`;

  const createRequestBase = {
    type: "text" as const,
    name: def.name,
    prompt: def.content,
    tags: def.tags,
    config: {
      ...(def.config ?? {}),
      langfuseLabel: LANGFUSE_LABEL,
      syncedAt: new Date().toISOString(),
    },
    commitMessage,
  };

  // Prefer creating with the label so this version becomes the deployment target.
  try {
    const created = await langfuse.api.promptsCreate({
      ...createRequestBase,
      labels: [LANGFUSE_LABEL],
    });
    return {
      status: existing ? "updated" : "created",
      version: created.version,
      previousVersion: existing?.version ?? null,
    };
  } catch {
    // Some Langfuse instances enforce label uniqueness strictly on create. Fall back to:
    // create without label → then move label via promptVersionUpdate (with defensive re-try).
    const created = await langfuse.api.promptsCreate({
      ...createRequestBase,
      labels: [],
    });

    try {
      await langfuse.api.promptVersionUpdate(def.name, created.version, {
        newLabels: [LANGFUSE_LABEL],
      });
    } catch (updateError) {
      if (!existing) {
        throw updateError;
      }

      // Remove label from previous version then set on new version.
      const previousLabels = Array.isArray(existing.labels) ? existing.labels : [];
      const withoutLabel = labelsForUpdate(previousLabels.filter((label) => label !== LANGFUSE_LABEL));

      await langfuse.api.promptVersionUpdate(def.name, existing.version, {
        newLabels: withoutLabel,
      });
      await langfuse.api.promptVersionUpdate(def.name, created.version, {
        newLabels: [LANGFUSE_LABEL],
      });
    }

    return {
      status: existing ? "updated" : "created",
      version: created.version,
      previousVersion: existing?.version ?? null,
    };
  }
}

async function main() {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    console.error("❌ Missing Langfuse credentials. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: LANGFUSE_BASE_URL,
  });

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║               Prompt Sync → Langfuse (v2 API)                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Langfuse: ${LANGFUSE_BASE_URL}`);
  console.log(`Label: ${LANGFUSE_LABEL}`);
  console.log("");

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const prompt of PROMPTS) {
    try {
      process.stdout.write(`• ${prompt.name} … `);
      const res = await upsertPrompt(langfuse, prompt);
      if (res.status === "created") results.created += 1;
      if (res.status === "updated") results.updated += 1;
      if (res.status === "skipped") results.skipped += 1;
      console.log(`${res.status} (v${res.version ?? "?"}${res.previousVersion ? `, prev v${res.previousVersion}` : ""})`);
    } catch (err) {
      results.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`failed (${message})`);
    }
  }

  if (shouldSunsetLegacyPrompts) {
    console.log("");
    console.log(`Sunsetting legacy prompt names (removing label "${LANGFUSE_LABEL}")…`);

    let sunsetUpdated = 0;
    let sunsetSkipped = 0;
    let sunsetFailed = 0;

    for (const legacyName of LEGACY_PROMPT_NAMES) {
      try {
        const legacy = await getPromptForLabel(langfuse, legacyName);
        if (!legacy) {
          sunsetSkipped += 1;
          continue;
        }

        const labels = Array.isArray(legacy.labels) ? legacy.labels : [];
        if (!labels.includes(LANGFUSE_LABEL)) {
          sunsetSkipped += 1;
          continue;
        }

        const withoutLabel = labelsForUpdate(labels.filter((label) => label !== LANGFUSE_LABEL));
        await langfuse.api.promptVersionUpdate(legacyName, legacy.version, {
          newLabels: withoutLabel,
        });
        sunsetUpdated += 1;
        console.log(`• ${legacyName} … unlabeled (v${legacy.version})`);
      } catch (err) {
        sunsetFailed += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.log(`• ${legacyName} … failed (${message})`);
      }
    }

    console.log(
      `Sunset summary: unlabeled=${sunsetUpdated} skipped=${sunsetSkipped} failed=${sunsetFailed}`,
    );
  }

  console.log("");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(
    `Summary: created=${results.created} updated=${results.updated} skipped=${results.skipped} failed=${results.failed}`,
  );
  console.log("══════════════════════════════════════════════════════════════");

  await langfuse.shutdownAsync();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
