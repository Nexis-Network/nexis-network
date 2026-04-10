import {
    buildSystemPrompt,
    buildFinalSystemPrompt,
} from "@/modules/chat/prompt-composer";
import { VariableResolver } from "./variable-resolver";
import { getSystemPromptProfile } from "@/modules/chat/system-prompt-profiles";
import { getPromptModuleTexts, resolvePromptModuleIds, buildToolGuide } from "@/modules/ai/system-guidance";
import {
    CHATBOT_TOOL_INTENT_GUIDE,
    CHATBOT_ARTIFACT_MANIFEST,
    CHATBOT_TOOL_BUDGET_PROMPT,
    CHATBOT_NATURAL_LANGUAGE_HINT,
    CHATBOT_SMART_CONTRACT_ARTIFACT_RULE,
} from "@/modules/ai/chatbot/constants";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_DEEP, SYSTEM_PROMPT_MINIMAL } from "@/modules/ai/system-prompt";
import {
    NEX_PERSONA,
    VERBOSITY_SPEC,
    TOOL_PLANNING_SPEC,
    USER_UPDATES_SPEC,
    FINAL_ANSWER_SPEC,
    ARTIFACT_USAGE_GUIDE,
    DOCUMENT_CANVAS_GUIDE,
    buildMetapromptsForIntent,
} from "@/modules/ai/metaprompts";
import { BLOCKSCOUT_TOOL_GUIDE } from "@/modules/ai/chatbot/blockscout-tools";
import { buildChainPlaybook, parseImpliedChainText } from "@/modules/ai/chain-playbooks";
import type { PipelineContext } from "./context-builder";
import type { ModelMessage } from "ai";
import type { IntentClassification } from "@/modules/chat/intent-classifier";
import { getSkillsForIntent, loadSkills } from "@/modules/ai/skills/skill-loader";
import {
    getLangfuseClient,
    type TraceContext,
} from "@/modules/chat/langfuse-tracing";
import {
    buildContextEnvelopePromptSummary,
    hashContextValue,
} from "@/modules/chat/context-envelope";
import {
    buildStandardizedRuntimeCapabilitySummary,
} from "@/modules/chat/pipeline/runtime-capabilities";
import type { ChatPipelineRuntimePlan } from "@/modules/chat/pipeline/runtime-plan";
import { extractLatestUserMessage } from "@/modules/chat/pipeline/request-normalization";

import type { AgentPortfolioSnapshot } from "@/server/services/agent-portfolio-service";
import type { AgentPosition } from "@/server/services/agent-position-tracker";

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Agent Wallet Context Builder
// ---------------------------------------------------------------------------

/**
 * Build a concise context string describing an agent's wallet portfolio and
 * open positions for injection into the system prompt.  Returns an empty
 * string when no agent context is available or when fetching fails (to avoid
 * breaking the chat pipeline).
 */
async function buildAgentWalletContext(agentId: string): Promise<string> {
    try {
        // Dynamic imports to avoid pulling server-only modules at module-parse time
        const { fetchAgentPortfolio } = await import("@/server/services/agent-portfolio-service");
        const { getOpenPositions } = await import("@/server/services/agent-position-tracker");

        const [portfolio, positions] = await Promise.all([
            fetchAgentPortfolio(agentId),
            getOpenPositions(agentId),
        ]);

        return formatAgentWalletContext(portfolio, positions);
    } catch (err) {
        logger.warn(
            { agentId, error: err instanceof Error ? err.message : String(err) },
            "agent_wallet_context_build_failed",
        );
        return "";
    }
}

function formatAgentWalletContext(
    portfolio: AgentPortfolioSnapshot,
    positions: AgentPosition[],
): string {
    if (portfolio.wallets.length === 0) {
        return "";
    }

    const lines: string[] = [];

    // Wallet addresses
    const walletLines = portfolio.wallets.map((w) => {
        const label = w.platform === "solana" ? "SOL" : "EVM";
        const truncated = w.address.length > 10
            ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}`
            : w.address;
        return `${label}: ${truncated} ($${w.netWorthUsd.toFixed(2)})`;
    });
    lines.push(`Wallets: ${walletLines.join(" | ")}`);

    // Net worth
    lines.push(`Net Worth: $${portfolio.totalNetWorthUsd.toFixed(2)}`);

    // Top 5 token holdings by value across all wallets
    const allTokens = portfolio.wallets
        .flatMap((w) => w.tokens)
        .filter((t) => t.usd_price != null);

    // Sort by USD value descending
    const tokensByValue = allTokens
        .map((t) => ({
            symbol: t.symbol ?? t.name ?? t.token_address?.slice(0, 8) ?? "???",
            value: Number(t.usd_value ?? 0),
            price: Number(t.usd_price ?? 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    if (tokensByValue.length > 0) {
        const holdingsStr = tokensByValue
            .map((t) => `${t.symbol}: $${t.value.toFixed(2)}`)
            .join(", ");
        lines.push(`Top Holdings: ${holdingsStr}`);
    }

    // Aggregate P&L
    const totalPnl = portfolio.wallets.reduce((acc, w) => acc + w.pnl.totalUsd, 0);
    const totalRoi = portfolio.wallets.reduce((acc, w) => acc + w.pnl.roiPercent, 0) / Math.max(portfolio.wallets.length, 1);
    const pnlSign = totalPnl >= 0 ? "+" : "";
    lines.push(`P&L: ${pnlSign}$${totalPnl.toFixed(2)} (${pnlSign}${totalRoi.toFixed(2)}%)`);

    // Active positions summary (limit to top 5)
    if (positions.length > 0) {
        const positionSummaries = positions.slice(0, 5).map((p) => {
            const symbol = p.tokenSymbol ?? p.tokenAddress.slice(0, 8);
            const notional = p.notionalUsd != null ? `$${p.notionalUsd.toFixed(2)}` : "?";
            const pnl = p.unrealizedPnl != null
                ? `${p.unrealizedPnl >= 0 ? "+" : ""}$${p.unrealizedPnl.toFixed(2)}`
                : "";
            return `${symbol} (${p.side}) ${notional}${pnl ? ` PnL:${pnl}` : ""}`;
        });
        lines.push(`Open Positions (${positions.length}): ${positionSummaries.join(" | ")}`);
    }

    return lines.join("\n");
}

const LANGFUSE_PROMPT_LABEL = (process.env.LANGFUSE_PROMPT_LABEL ?? "production").trim() || "production";
const OUTPUT_STREAM_GUARD = `
Output rules:
- Stream *human-readable prose* only.
- Never emit raw JSON artifacts in prose. Use the \`emit_artifact\` tool for structured artifact output.
- Never expose tool planning or execution scaffolding in assistant prose:
  no "Intent", "Tool", "Tool args", "TOOL PATH", or similar preparation text.
- For approval-required actions, give at most one short user-facing summary sentence;
  the approval UI carries the operational details.
- Tool planning blocks (e.g., <plan_tool_usage>) must stay internal and never include secrets.
- If you are unsure, say so and ask for the missing input; do not invent data.`.trim();

const SMART_CONTRACT_ARTIFACT_GUARD = `
Smart-contract delivery rules:
- For requests like "smart contract", "solidity contract", "erc20 contract", "erc20 token code", "memecoin contract/code", "nft contract/code", you MUST emit \`smart-contract-viewer\`.
- Put full contract source in the right-panel artifact payload files (\`.sol\` or \`.rs\`).
- Do not paste full contract code blocks in assistant prose for these intents; provide a short summary and point to the panel.`.trim();

// Prompt cache to avoid repeated Langfuse fetches (5 minute TTL)
const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000;
const promptCache = new Map<string, { content: string; version: number; name: string; expiresAt: number }>();

async function getPrompt(name: string, fallback: string): Promise<{ content: string; version: number; name: string }> {
    const cacheKey = `${name}:${LANGFUSE_PROMPT_LABEL}`;
    const langfuse = getLangfuseClient();
    // Check cache first
    const cached = promptCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return { content: cached.content, version: cached.version, name: cached.name };
    }

    try {
        if (!langfuse) {
            const result = { content: fallback, version: 0, name };
            promptCache.set(cacheKey, { ...result, expiresAt: Date.now() + PROMPT_CACHE_TTL_MS });
            return result;
        }

	        const prompt = await langfuse.api.promptsGet({ promptName: name, label: LANGFUSE_PROMPT_LABEL });
	        const content =
	            prompt.type === "text"
	                ? prompt.prompt
	                : prompt.prompt
	                        .map((m) => (m.type === "chatmessage" ? `${m.role}: ${m.content}` : `{{${m.name}}}`))
	                        .join("\n");

        const result = { content, version: prompt.version, name };
        // Cache the result
        promptCache.set(cacheKey, { ...result, expiresAt: Date.now() + PROMPT_CACHE_TTL_MS });
        return result;
    } catch (error) {
        logger.warn(
            `Failed to fetch prompt '${name}' (label=${LANGFUSE_PROMPT_LABEL}) from Langfuse, using fallback.`,
            error,
        );
        const result = { content: fallback, version: 0, name: name };
        // Cache fallback too to avoid repeated failures
        promptCache.set(cacheKey, { ...result, expiresAt: Date.now() + PROMPT_CACHE_TTL_MS });
        return result;
    }
}

const CACHE_SAFETY_PROMPT = `When deciding the "cacheable" flag in the structured response, set it to true only if the answer contains strictly public information, no attachment-derived content, and no personalized summaries. Otherwise, set it to false.`;

const PROMPT_NAMES = {
    runtime: {
        system: "nex.runtime.system",
        systemFast: "nex.runtime.system_fast",
        systemDeep: "nex.runtime.system_deep",
        toolIntentGuide: "nex.runtime.tool_intent_guide",
        artifactManifest: "nex.runtime.artifact_manifest",
        toolBudget: "nex.runtime.tool_budget",
        naturalLanguageHint: "nex.runtime.natural_language_hint",
        cacheSafety: "nex.runtime.cache_safety",
        blockscoutGuide: "nex.runtime.blockscout_guide",
    },
    meta: {
        persona: "nex.meta.persona",
        verbosity: "nex.meta.verbosity",
        toolPlanning: "nex.meta.tool_planning",
        userUpdates: "nex.meta.user_updates",
        finalAnswer: "nex.meta.final_answer",
        artifactGuide: "nex.meta.artifact_guide",
        documentCanvasGuide: "nex.meta.document_canvas_guide",
    },
} as const;

export class PromptFactory {
    async assemble(
        context: PipelineContext,
        options: {
            classification?: IntentClassification | null;
            runtimePlan?: ChatPipelineRuntimePlan;
            traceContext?: TraceContext | null;
        } = {},
    ): Promise<{
        system: string;
        messages: ModelMessage[];
        promptVersions: Record<string, number>;
        promptLabel: string;
        systemHash: string | null;
        versionHash: string | null;
        maxTokens?: number;
    }> {
        const { request, automation } = context;
        const {
            systemPromptProfileId,
            promptModules,
            artifactHints,
            marketContext,
            messages,
        } = request;

        const latestUserMessage = extractLatestUserMessage(messages);
        const systemPromptProfile = getSystemPromptProfile(systemPromptProfileId);
        const classification = options.classification ?? null;
        const runtimePlan = options.runtimePlan;

        const shouldUseDeepSystemPrompt = (() => {
            if (!classification) return systemPromptProfileId === "research";
            if (systemPromptProfileId === "research") return true;
            const deepCategories: IntentClassification["category"][] = [
                "research",
                "analysis",
                "complex_task",
                "smart_contract",
                "document_analysis",
                "code_generation",
            ];
            return deepCategories.includes(classification.category);
        })();

        const shouldUseFastSystemPrompt = Boolean(classification?.fastPathEligible);

        const selectedSystemPrompt = shouldUseFastSystemPrompt
            ? { name: PROMPT_NAMES.runtime.systemFast, fallback: SYSTEM_PROMPT_MINIMAL }
            : shouldUseDeepSystemPrompt
                ? { name: PROMPT_NAMES.runtime.systemDeep, fallback: SYSTEM_PROMPT_DEEP }
                : { name: PROMPT_NAMES.runtime.system, fallback: SYSTEM_PROMPT };

        // Resolve Prompt Modules
        const resolvedPromptModuleIds = resolvePromptModuleIds(promptModules);
        const promptModuleSegments =
            resolvedPromptModuleIds.length > 0 ? getPromptModuleTexts(resolvedPromptModuleIds) : [];

        // Fetch Prompts from Langfuse (or fallback)
        const [
            toolIntentGuide,
            artifactManifest,
            toolBudgetPrompt,
            naturalLanguageHint,
            cacheSafetyPrompt,
            systemPrompt,
            nexPersona,
            nexVerbosity,
            nexToolPlanning,
            nexUserUpdates,
            nexFinalAnswer,
            nexArtifactGuide,
            nexDocumentCanvasGuide,
            blockscoutGuide,
        ] = await Promise.all([
            getPrompt(PROMPT_NAMES.runtime.toolIntentGuide, CHATBOT_TOOL_INTENT_GUIDE),
            getPrompt(PROMPT_NAMES.runtime.artifactManifest, CHATBOT_ARTIFACT_MANIFEST),
            getPrompt(PROMPT_NAMES.runtime.toolBudget, CHATBOT_TOOL_BUDGET_PROMPT),
            getPrompt(PROMPT_NAMES.runtime.naturalLanguageHint, CHATBOT_NATURAL_LANGUAGE_HINT),
            getPrompt(PROMPT_NAMES.runtime.cacheSafety, CACHE_SAFETY_PROMPT),
            getPrompt(selectedSystemPrompt.name, selectedSystemPrompt.fallback),
            getPrompt(PROMPT_NAMES.meta.persona, NEX_PERSONA),
            getPrompt(PROMPT_NAMES.meta.verbosity, VERBOSITY_SPEC),
            getPrompt(PROMPT_NAMES.meta.toolPlanning, TOOL_PLANNING_SPEC),
            getPrompt(PROMPT_NAMES.meta.userUpdates, USER_UPDATES_SPEC),
            getPrompt(PROMPT_NAMES.meta.finalAnswer, FINAL_ANSWER_SPEC),
            getPrompt(PROMPT_NAMES.meta.artifactGuide, ARTIFACT_USAGE_GUIDE),
            getPrompt(PROMPT_NAMES.meta.documentCanvasGuide, DOCUMENT_CANVAS_GUIDE),
            getPrompt(PROMPT_NAMES.runtime.blockscoutGuide, BLOCKSCOUT_TOOL_GUIDE),
        ]);

        // Resolve Variables (with lazy loading options based on context)
        const variables = await VariableResolver.resolve(context, {
            skipMemoryFetch: true,
            skipTasksFetch: shouldUseFastSystemPrompt,
            skipWatchlistFetch: shouldUseFastSystemPrompt,
        });
        const impliedChain = variables["{{IMPLIED_CHAIN}}"] ?? "";
        const chainPlaybook = buildChainPlaybook(parseImpliedChainText(impliedChain));

        // Base System Prompt
        const applyVariables = (input: string) => {
            let out = input;
            for (const [key, value] of Object.entries(variables)) {
                out = out.split(key).join(value);
            }
            return out;
        };

        let baseSystemPromptContent = applyVariables(systemPrompt.content);

        const baseSystemPrompt = [baseSystemPromptContent] // walletSnapshot is now in {{WALLET_CONTEXT}}
            .filter((segment): segment is string => Boolean(segment && segment.trim().length > 0))
            .join("\n\n");

        // Skill Injection
        // Only load skills if we are NOT in the fast-path (greetings, price checks) where latency is critical
        let skillsContext = "";
        const requiredSkills =
            runtimePlan?.requiredSkills ??
            (!shouldUseFastSystemPrompt && classification
                ? getSkillsForIntent(classification.category)
                : []);
        if (!shouldUseFastSystemPrompt && requiredSkills.length > 0) {
            skillsContext = await loadSkills(requiredSkills);
        }

        const systemPromptWithSkills = skillsContext 
            ? `${baseSystemPrompt}\n\n<technical_skills>\n${skillsContext}\n</technical_skills>`
            : baseSystemPrompt;

        // Enriched System Prompt (memory injection is handled via VariableResolver)
        let enrichedSystemPrompt = await buildSystemPrompt({
            basePrompt: systemPromptWithSkills,
            latestUserMessage,
            automationDirective: automation.summary.directive,
            systemProfileInstruction: systemPromptProfile.instructions,
            promptModuleSegments,
            artifactHints: Array.isArray(artifactHints) ? artifactHints : [],
        });

        // Memory Injection - Handled by VariableResolver now
        // Username Injection - Handled by VariableResolver now

        // Grounding Instruction
        enrichedSystemPrompt = `${enrichedSystemPrompt}\n\nIMPORTANT: If you do not know the answer based on the context, admit it. Do not make up facts.`;

        const runtimeCapabilitySummary = runtimePlan
            ? buildStandardizedRuntimeCapabilitySummary({
                capabilityFlags: runtimePlan.capabilities,
                enabledMcpServers: context.enabledMcpServers.map((server) => server.name),
                requiredSkills,
                promptLabel: LANGFUSE_PROMPT_LABEL,
            })
            : "";
        if (runtimeCapabilitySummary) {
            enrichedSystemPrompt += `\n\n<standardized_runtime_capabilities>\n${runtimeCapabilitySummary}\n</standardized_runtime_capabilities>`;
        }

        // Inject Agent Wallet Context (only when agentId is available)
        if (context.agentId && !shouldUseFastSystemPrompt) {
            const agentWalletCtx = await buildAgentWalletContext(context.agentId);
            if (agentWalletCtx) {
                enrichedSystemPrompt += `\n\n<agent_wallet_context>\nYou are operating as an AI agent with dedicated wallets. Here is the agent's current portfolio state:\n${agentWalletCtx}\n</agent_wallet_context>`;
            }
        }

        // Inject Nex Wallet context for users with Nex Wallets
        if (!shouldUseFastSystemPrompt) {
            try {
                const { fetchBatchBalances } = await import("@/server/services/cdp/balance-service");
                const { getSupabaseAdminClient } = await import("@/server/services/supabase/supabase-admin");
                const supabase = getSupabaseAdminClient();
                const userId = context.auth.userId;

                if (userId) {
                    const { data: cdpWallets } = await supabase
                        .from("wallet_accounts")
                        .select("address,platform,wallet_id")
                        .eq("user_id", userId)
                        .eq("wallet_type", "cdp");

                    if (cdpWallets && cdpWallets.length > 0) {
                        const walletDescriptors = cdpWallets.map((w: UntypedJson) => ({
                            address: w.address as string,
                            platform: w.platform as "evm" | "solana",
                            chainId: w.platform === "evm" ? 8453 : undefined,
                        }));

                        const batchResult = await fetchBatchBalances(walletDescriptors);

                        const cdpLines: string[] = ["Nex Wallets:"];
                        for (const [address, bal] of batchResult) {
                            const label = bal.platform === "solana" ? "SOL" : "EVM (Base)";
                            const truncAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
                            cdpLines.push(`  ${label}: ${truncAddr} ($${(bal.totalUsdValue ?? 0).toFixed(2)})`);

                            if (bal.native) {
                                cdpLines.push(`    Native: ${bal.native.balance} ${bal.native.symbol}`);
                            }

                            const topTokens = (bal.tokens ?? [])
                                .filter((t: UntypedJson) => Number(t.balance ?? 0) > 0)
                                .slice(0, 5);

                            for (const tok of topTokens) {
                                cdpLines.push(`    ${tok.symbol}: ${tok.balance}`);
                            }
                        }

                        enrichedSystemPrompt += `\n\n<cdp_wallet_context>\n${cdpLines.join("\n")}\nTo send, swap, or check balance, use the cdp_wallet_send, cdp_wallet_swap, or cdp_wallet_balance tools.\n</cdp_wallet_context>`;
                    }
                }
            } catch (err) {
                logger.warn({ err }, "Failed to inject Nex Wallet context into prompt");
            }
        }

        // Adaptive Metaprompts (Langfuse-backed; local fallbacks)
        const metapromptResult = classification
            ? buildMetapromptsForIntent(classification, {
                persona: nexPersona.content,
                verbosity: nexVerbosity.content,
                toolPlanning: nexToolPlanning.content,
                userUpdates: nexUserUpdates.content,
                finalAnswer: nexFinalAnswer.content,
                artifactGuide: nexArtifactGuide.content,
                documentCanvasGuide: nexDocumentCanvasGuide.content,
            })
            : null;

        const metaprompts = metapromptResult ? applyVariables(metapromptResult.metaprompts) : "";

        // Format Messages
        const formattedModelMessages: ModelMessage[] = messages.map((message) => ({
            role: message.role,
            content: message.content,
        }));

        const promptVersions = {
            [toolIntentGuide.name]: toolIntentGuide.version,
            [artifactManifest.name]: artifactManifest.version,
            [toolBudgetPrompt.name]: toolBudgetPrompt.version,
            [naturalLanguageHint.name]: naturalLanguageHint.version,
            [cacheSafetyPrompt.name]: cacheSafetyPrompt.version,
            [systemPrompt.name]: systemPrompt.version,
            [nexPersona.name]: nexPersona.version,
            [nexVerbosity.name]: nexVerbosity.version,
            [nexToolPlanning.name]: nexToolPlanning.version,
            [nexUserUpdates.name]: nexUserUpdates.version,
            [nexFinalAnswer.name]: nexFinalAnswer.version,
            [nexArtifactGuide.name]: nexArtifactGuide.version,
            [nexDocumentCanvasGuide.name]: nexDocumentCanvasGuide.version,
            output_stream_guard: 1,
            smart_contract_artifact_guard: 1,
        };
        const envelopeSummary = buildContextEnvelopePromptSummary({
            ...context.contextEnvelope,
            prompt: {
                ...context.contextEnvelope.prompt,
                versions: promptVersions,
            },
        });

        // Final System Prompt (with Tool Specs)
        const includeToolGuide = !shouldUseFastSystemPrompt;
        const includeArtifactManifest = !shouldUseFastSystemPrompt || classification?.category === "wallet_create";
        const toolGuide = includeToolGuide
            ? await buildToolGuide({
                automationSummary: automation.summary.summary,
                toolIds: Array.isArray(runtimePlan?.promptScopedToolIds)
                    ? runtimePlan.promptScopedToolIds
                    : undefined,
            })
            : "";

        const finalSystemPrompt = buildFinalSystemPrompt({
            base: metaprompts ? `${metaprompts}\n\n${enrichedSystemPrompt}` : enrichedSystemPrompt,
            marketContext,
            extra: [
                // Tool specifications and guides
                ...(includeToolGuide ? [applyVariables(toolGuide)] : []),
                ...(includeToolGuide && chainPlaybook ? [chainPlaybook] : []),
                applyVariables(toolIntentGuide.content),
                ...(includeArtifactManifest ? [applyVariables(artifactManifest.content)] : []),
                applyVariables(toolBudgetPrompt.content),
                applyVariables(naturalLanguageHint.content),
                applyVariables(CHATBOT_SMART_CONTRACT_ARTIFACT_RULE),
                applyVariables(cacheSafetyPrompt.content),
                applyVariables(blockscoutGuide.content),
                envelopeSummary,
                OUTPUT_STREAM_GUARD,
                SMART_CONTRACT_ARTIFACT_GUARD,
            ],
        });
        const systemHash = hashContextValue(finalSystemPrompt);
        const versionHash = hashContextValue(promptVersions);

        return {
            system: finalSystemPrompt,
            messages: formattedModelMessages,
            promptVersions,
            promptLabel: LANGFUSE_PROMPT_LABEL,
            systemHash,
            versionHash,
            maxTokens: metapromptResult?.maxTokens,
        };
    }
}
