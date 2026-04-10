import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import { SYSTEM_PROMPT } from "@/modules/ai/system-prompt";
import { type PromptModuleId, isPromptModuleId } from "@/modules/ai/system-prompt/module-ids";
import toolsSpec from "@/tools.json";
import { registryService } from "@/modules/mcp/registry-service";
import { MORALIS_MCP_TOOL_REGISTRY, type MoralisMcpToolDefinition } from "@/modules/ai/mcp/moralis-mcp-registry";
import { filterBlockedToolIds } from "@/modules/ai/tool-risk-registry";

type ToolDefinition = {
  id: string;
  description?: string;
  approval?: string;
  endpoint?: string;
  method?: string;
  input_schema?: Record<string, UntypedJson>;
  output_schema?: Record<string, UntypedJson>;
};

type ToolUseRules = {
  pre_call_template?: string;
  post_call_validate?: string;
  confirmation_required_for?: string[];
  preview_artifact_required?: boolean;
  default_retry_policy?: Record<string, UntypedJson>;
};

type ToolsSpec = {
  version?: string;
  agent?: string;
  allowed_tools?: string[];
  tools?: ToolDefinition[];
  tool_use_rules?: ToolUseRules;
};

type ChainNamespace = "offchain" | "evm" | "solana" | "bitcoin" | "mcp" | "multi" | "unknown";
type ToolActionType = "read" | "write" | "mixed";

type OpenAIFunctionTool = {
  type: "function";
  function: {
    name: string;
    description: string | undefined;
    parameters: Record<string, UntypedJson>;
  };
};

const ROOT_DIR = process.cwd();
const SYSTEM_PROMPT_MODULES_DIR = path.resolve(ROOT_DIR, "system-prompts");

const moduleCache = new Map<PromptModuleId, { mtime: number; text: string }>();

export const getSystemPromptText = (): string => {
  return SYSTEM_PROMPT;
};

const getPromptModulePath = (id: PromptModuleId): string => {
  const filename = `${id}.md`;
  return path.resolve(SYSTEM_PROMPT_MODULES_DIR, filename);
};

const getPromptModuleMtime = (id: PromptModuleId): number => {
  try {
    return statSync(getPromptModulePath(id)).mtimeMs;
  } catch {
    return -1;
  }
};

const readPromptModuleText = (id: PromptModuleId): string | null => {
  const filePath = getPromptModulePath(id);
  try {
    return readFileSync(filePath, "utf-8").trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[system-prompt] Failed to read module "${id}": ${message}`);
    return null;
  }
};

export const getPromptModuleTexts = (moduleIds: PromptModuleId[]): string[] => {
  return moduleIds
    .map((id) => {
      const nextMtime = getPromptModuleMtime(id);
      const cached = moduleCache.get(id);
      if (cached && cached.mtime === nextMtime) {
        return cached.text;
      }
      const text = readPromptModuleText(id);
      if (text == null) {
        moduleCache.delete(id);
        return null;
      }
      moduleCache.set(id, { mtime: nextMtime, text });
      return text;
    })
    .filter((segment): segment is string => Boolean(segment && segment.length > 0));
};

export const resolvePromptModuleIds = (requested?: string[]): PromptModuleId[] => {
  if (!requested || requested.length === 0) {
    return [];
  }
  const seen = new Set<PromptModuleId>();
  requested.forEach((value) => {
    if (!isPromptModuleId(value)) {
      return;
    }
    if (!seen.has(value)) {
      seen.add(value);
    }
  });
  return Array.from(seen);
};

export const getToolsSpecText = (): string => {
  return JSON.stringify(toolsSpec);
};

// Async resolver for ToolsSpec that merges static JSON with DB registry
export const resolveToolsSpec = async (): Promise<ToolsSpec> => {
  const staticSpec = toolsSpec as ToolsSpec;

  try {
    const dbTools = await registryService.getAllTools();

    // Merge tools: DB tools override static tools with same ID
    const staticToolsMap = new Map((staticSpec.tools ?? []).map(t => [t.id, t]));
    dbTools.forEach(t => staticToolsMap.set(t.id, t));

    const mergedTools = Array.from(staticToolsMap.values()).filter(
      (tool): tool is ToolDefinition =>
        typeof tool?.id === "string" && filterBlockedToolIds([tool.id]).length > 0,
    );

    // Merge allowed_tools: Add all DB tools to allowed list for now (or filter based on logic)
    const staticAllowed = new Set(staticSpec.allowed_tools ?? []);
    dbTools.forEach(t => staticAllowed.add(t.id));

    return {
      ...staticSpec,
      tools: mergedTools,
      allowed_tools: filterBlockedToolIds(Array.from(staticAllowed)),
    };
  } catch (error) {
    logger.warn("[system-guidance] Failed to fetch dynamic tools, falling back to static spec", error);
    return {
      ...staticSpec,
      tools: (staticSpec.tools ?? []).filter(
        (tool): tool is ToolDefinition =>
          typeof tool?.id === "string" && filterBlockedToolIds([tool.id]).length > 0,
      ),
      allowed_tools: filterBlockedToolIds(staticSpec.allowed_tools ?? []),
    };
  }
};

export const resolveAllowedToolIds = async (): Promise<string[]> => {
  const spec = await resolveToolsSpec();
  return Array.isArray(spec.allowed_tools) ? spec.allowed_tools : [];
};

type BuildToolGuideOptions = {
  /**
   * When provided, only include these tools in the textual guide (in the given order).
   * This should generally match the tools actually loaded for the request (or the intent tool map),
   * to reduce prompt size and improve tool selection accuracy.
   */
  toolIds?: string[];
  /** Optional short summary of user automation/approval preferences to surface near the action boundary map. */
  automationSummary?: string;
  /**
   * Include per-tool description bullets. Defaults to true for backward compatibility.
   * When tools are already provided to the model as tool schemas, you can set this false
   * to further reduce token usage.
   */
  includeDescriptions?: boolean;
  /** Include a strict READ vs WRITE action map. Defaults to true. */
  includeActionMap?: boolean;
};

const uniq = <T,>(values: readonly T[]): T[] => Array.from(new Set(values));

const MORALIS_MCP_TOOL_BY_NAME = new Map<string, MoralisMcpToolDefinition>(
  MORALIS_MCP_TOOL_REGISTRY.map((tool) => [tool.name, tool]),
);

const buildMoralisMcpGuide = (toolIds: string[]): string | null => {
  const moralisIds = uniq(toolIds).filter((id) => id.startsWith("mcp_moralis__"));
  if (moralisIds.length === 0) return null;

  const entries = moralisIds.map((id) => {
    const baseName = id.split("__")[1] ?? id;
    const registry = MORALIS_MCP_TOOL_BY_NAME.get(baseName);
    return {
      id,
      baseName,
      registry,
      chain: registry?.chain ?? "unknown",
      category: registry?.category ?? "other",
      description: registry?.description ?? "Moralis MCP tool (description unavailable).",
      requiredInputs: registry?.requiredInputs ?? [],
      dynamicLoading: registry?.dynamicLoading ?? "Load only when the user request matches this tool.",
    };
  });

  const byChain = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = byChain.get(entry.chain) ?? [];
    list.push(entry);
    byChain.set(entry.chain, list);
  }

  const chainOrder = ["evm", "solana", "unknown"];
  const lines: string[] = [];
  lines.push("# Moralis MCP (read-only data)");
  lines.push("- Moralis MCP tools are read-only; never execute value-moving actions via Moralis.");
  lines.push("- EVM tools require 0x addresses; Solana tools require base58 addresses. Never mix formats.");
  lines.push("- Specify chain/network explicitly when the user requests a non-default network.");

  for (const chain of chainOrder) {
    const chainEntries = byChain.get(chain);
    if (!chainEntries || chainEntries.length === 0) continue;

    const chainTitle =
      chain === "evm" ? "EVM tools" : chain === "solana" ? "Solana tools" : "Other tools";
    lines.push("");
    lines.push(`## ${chainTitle}`);

    const byCategory = new Map<string, typeof chainEntries>();
    for (const entry of chainEntries) {
      const list = byCategory.get(entry.category) ?? [];
      list.push(entry);
      byCategory.set(entry.category, list);
    }

    const categoryOrder = [
      "wallet",
      "token",
      "nft",
      "dex",
      "defi",
      "market",
      "analytics",
      "holders",
      "entities",
      "chain",
      "other",
    ];

    for (const category of categoryOrder) {
      const categoryEntries = byCategory.get(category);
      if (!categoryEntries || categoryEntries.length === 0) continue;
      const dynamicLoading = categoryEntries[0]?.dynamicLoading;
      lines.push(`### ${category}`);
      lines.push(`- Load: ${dynamicLoading}`);
      const sorted = categoryEntries.sort((a, b) => a.id.localeCompare(b.id));
      for (const entry of sorted) {
        const required = entry.requiredInputs.length > 0 ? entry.requiredInputs.join(", ") : "none";
        lines.push(`- ${entry.id}: ${entry.description} Required: ${required}.`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
};

const inferChainNamespaceForTool = (toolId: string): ChainNamespace => {
  if (!toolId) return "unknown";
  if (toolId === "openai_mcp") return "mcp";
  if (toolId.startsWith("mcp_")) {
    const [, rawToolName] = toolId.split("__", 2);
    const name = (rawToolName ?? "").toLowerCase();

    // Common MCP naming conventions:
    // - Moralis: `evm_*` or `solana_*`
    // - Nex MCP: module-prefixed names (aave_*, debank_*, pumpswap_*, wormhole_*, aster_*, bsc_*)
    if (name.startsWith("solana_") || name.startsWith("sol_") || name.startsWith("pumpswap_")) return "solana";
    if (name.startsWith("evm_") || name.startsWith("aave_") || name.startsWith("debank_") || name.startsWith("bsc_"))
      return "evm";
    if (name.startsWith("wormhole_")) return "multi";
    if (name.startsWith("aster_")) return "offchain";

    return "mcp";
  }

  // Multi-wallet inventory is inherently multi-chain.
  if (toolId === "agent_wallet_list") {
    return "multi";
  }

  // Wallet analytics tools are multi-chain (Moralis-backed).
  if (toolId.startsWith("wallet_get_")) {
    return "multi";
  }

  if (toolId === "bitcoin_network" || toolId.startsWith("btc_") || toolId.startsWith("lightning_")) {
    return "bitcoin";
  }

  if (
    toolId === "helius_solana" ||
    toolId.startsWith("pumpfun_") ||
    toolId.startsWith("pumpswap_") ||
    toolId.startsWith("sol_")
  ) {
    return "solana";
  }

  if (
    toolId === "evm_wallet" ||
    toolId === "cryptowallet_evm" ||
    toolId === "token_minter" ||
    toolId.startsWith("wallet_") ||
    toolId.startsWith("provider_") ||
    toolId.startsWith("network_") ||
    toolId === "bsc_chain" ||
    toolId === "etherscan" ||
    toolId === "alchemy_sdk" ||
    toolId === "chainlink_feeds" ||
    toolId === "blocknative_gas"
  ) {
    return "evm";
  }

  if (
    toolId.startsWith("openai_") ||
    toolId.startsWith("exa_") ||
    toolId.startsWith("web_search") ||
    toolId.startsWith("market_") ||
    toolId.startsWith("coingecko_") ||
    toolId.startsWith("binance_") ||
    toolId === "cryptorank" ||
    toolId === "crypto_sentiment" ||
    toolId === "task_scheduler" ||
    toolId === "openai_code_interpreter" ||
    toolId === "bedrock_code_interpreter"
  ) {
    return "offchain";
  }

  if (
    toolId === "dexscreener" ||
    toolId === "uniswap_poolspy" ||
    toolId === "defi_llama" ||
    toolId === "wallet_get_holdings" // multi-chain (Moralis)
  ) {
    return "multi";
  }

  return "unknown";
};

const MIXED_TOOL_IDS = new Set<string>([
  "evm_wallet",
  "cryptowallet_evm",
  "token_minter",
  "bitcoin_network",
  "helius_solana",
  "bsc_chain",
  "pumpfun_trader",
  "openai_mcp",
]);

const VALUE_MOVING_NAME_PATTERNS: RegExp[] = [
  /(^|_)order(_|$)/i,
  /(^|_)swap(_|$)/i,
  /(^|_)trade(_|$)/i,
  /(^|_)execute(_|$)/i,
  /(^|_)send(_|$)/i,
  /(^|_)transfer(_|$)/i,
  /(^|_)approve(_|$)/i,
  /(^|_)sign(_|$)/i,
  /(^|_)place(_|$)/i,
  /(^|_)cancel(_|$)/i,
  /(^|_)withdraw(_|$)/i,
  /(^|_)deposit(_|$)/i,
  /(^|_)bridge(_|$)/i,
  /(^|_)deploy(_|$)/i,
  /(^|_)mint(_|$)/i,
  /(^|_)stake(_|$)/i,
  /(^|_)unstake(_|$)/i,
  /(^|_)buy(_|$)/i,
  /(^|_)sell(_|$)/i,
];

const isProbablyValueMovingName = (raw: string): boolean => {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();

  // Avoid false positives for common read-only endpoints.
  if (normalized.includes("order_book") || normalized.includes("orderbook")) return false;
  if (normalized.includes("recent_trades") || normalized.endsWith("_trades")) return false;
  if (normalized.includes("swap_quote") || normalized.includes("swap_price")) return false;
  if (normalized.endsWith("_quote") || normalized.endsWith("_price")) return false;
  if (normalized.includes("transfer_status") || normalized.includes("route_status")) return false;

  return VALUE_MOVING_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const inferToolActionType = (toolId: string, toolDef: ToolDefinition | undefined): ToolActionType => {
  if (MIXED_TOOL_IDS.has(toolId)) return "mixed";
  if (toolId.startsWith("mcp_")) {
    const [, rawToolName] = toolId.split("__", 2);
    const toolName = rawToolName ?? toolId;
    if (isProbablyValueMovingName(toolName)) return "write";
    return "read";
  }

  const approval = typeof toolDef?.approval === "string" ? toolDef.approval : "";
  if (approval && approval !== "none") {
    return "write";
  }

  return "read";
};

const formatToolIdList = (toolIds: string[]) => toolIds.map((id) => `\`${id}\``).join(", ");

const buildDirectActionMap = (toolIds: string[], toolDefsById: Map<string, ToolDefinition>): string | null => {
  const normalized = uniq(toolIds).filter((id) => typeof id === "string" && id.trim().length > 0);
  if (normalized.length === 0) return null;

  const readByChain: Record<ChainNamespace, string[]> = {
    offchain: [],
    evm: [],
    solana: [],
    bitcoin: [],
    mcp: [],
    multi: [],
    unknown: [],
  };
  const writeByChain: Record<ChainNamespace, string[]> = {
    offchain: [],
    evm: [],
    solana: [],
    bitcoin: [],
    mcp: [],
    multi: [],
    unknown: [],
  };
  const mixed: string[] = [];

  for (const toolId of normalized) {
    const def = toolDefsById.get(toolId);
    const chain = inferChainNamespaceForTool(toolId);
    const action = inferToolActionType(toolId, def);

    if (action === "mixed") {
      mixed.push(toolId);
      continue;
    }
    if (action === "write") {
      writeByChain[chain].push(toolId);
      continue;
    }
    readByChain[chain].push(toolId);
  }

  const lines: string[] = [];
  lines.push("# Action Boundary (Direct Mapping)");
  lines.push("");
  lines.push("## READ (data-only; safe to call immediately)");

  const readSections: Array<{ title: string; ids: string[] }> = [
    { title: "Off-chain / research", ids: readByChain.offchain },
    { title: "Multi-chain market/wallet analytics", ids: readByChain.multi },
    { title: "EVM data", ids: readByChain.evm },
    { title: "Solana data", ids: readByChain.solana },
    { title: "Bitcoin/Lightning data", ids: readByChain.bitcoin },
    { title: "MCP data", ids: readByChain.mcp },
    { title: "Other / unknown", ids: readByChain.unknown },
  ];

  for (const section of readSections) {
    if (section.ids.length === 0) continue;
    lines.push(`### ${section.title}`);
    lines.push(`- ${formatToolIdList(section.ids)}`);
  }

  lines.push("");
  lines.push("## WRITE (state-change / value-moving; requires approval unless auto-approve is enabled)");
  const writeSections: Array<{ title: string; ids: string[] }> = [
    { title: "Off-chain side effects", ids: writeByChain.offchain },
    { title: "EVM execution", ids: writeByChain.evm },
    { title: "Solana execution", ids: writeByChain.solana },
    { title: "Bitcoin/Lightning execution", ids: writeByChain.bitcoin },
    { title: "MCP execution", ids: writeByChain.mcp },
    { title: "Multi-chain execution", ids: writeByChain.multi },
    { title: "Other / unknown", ids: writeByChain.unknown },
  ];

  for (const section of writeSections) {
    if (section.ids.length === 0) continue;
    lines.push(`### ${section.title}`);
    lines.push(`- ${formatToolIdList(section.ids)}`);
  }

  if (mixed.length > 0) {
    lines.push("");
    lines.push("## MIXED tools (command-level READ vs WRITE; do not confuse)");

    if (mixed.includes("evm_wallet") || mixed.includes("cryptowallet_evm")) {
      lines.push("### `evm_wallet` / `cryptowallet_evm`");
      lines.push("- READ: `wallet_create_random`, `wallet_get_*`, `provider_get_*`, `network_get_*`");
      lines.push(
        "- WRITE (approval): `wallet_send_transaction`, `wallet_sign_transaction`, `wallet_sign_message`, `wallet_sign_typed_data`",
      );
      lines.push(
        "- BLOCKED (never in chat): `wallet_get_private_key`, `wallet_get_mnemonic`, `wallet_from_*`, `wallet_encrypt`, `wallet_from_encrypted_json`, `wallet_create_mnemonic_phrase`",
      );
    }

    if (mixed.includes("evm_wallet_send_asset")) {
      lines.push("### `evm_wallet_send_asset`");
      lines.push("- WRITE (approval): managed-wallet native/ERC-20 transfer after the sender address is known.");
    }

    if (mixed.includes("token_minter")) {
      lines.push("### `token_minter`");
      lines.push("- READ: `getBalance`, `getTokenInfo`, `getTokenBalance`, `getTransactionInfo`");
      lines.push("- WRITE (approval): `deployToken`, `transferToken`");
    }

    if (mixed.includes("bsc_chain")) {
      lines.push("### `bsc_chain`");
      lines.push(
        "- READ: `Get_Wallet_Info`, `Token_Security_Check`, `QueryMemeTokenDetails`, `View_PancakeSwap_Positions`",
      );
      lines.push("- WRITE (approval): all other commands (swaps/LP/meme trading)");
    }

    if (mixed.includes("helius_solana")) {
      lines.push("### `helius_solana`");
      lines.push("- READ: `helius_get_*` (balance, token accounts, tx lookup, etc.)");
      lines.push("- WRITE (approval): `helius_execute_jupiter_swap`, `helius_send_jito_bundle`");
    }

    if (mixed.includes("pumpfun_trader")) {
      lines.push("### `pumpfun_trader`");
      lines.push("- READ: `get_bonding_curve`, `get_global_account`");
      lines.push("- WRITE (approval): `create_and_buy`, `buy`, `sell` (may be blocked in chat if signing material is required)");
    }

    if (mixed.includes("bitcoin_network")) {
      lines.push("### `bitcoin_network`");
      lines.push("- READ: `get_balance`, `get_address`, `get_*`");
      lines.push("- WRITE (approval): `send_bitcoin`, `sign_transaction`, `create_invoice`, `pay_invoice`");
    }

    if (mixed.includes("openai_mcp")) {
      lines.push("### `openai_mcp`");
      lines.push("- Treat as data-routing. Never execute value-moving actions in chat via MCP unless explicitly allowed.");
    }
  }

  lines.push("");
  lines.push("## Chain requirements for WRITE");
  lines.push("- Always specify chain/network: EVM uses `chainId`; Solana uses `cluster` (mainnet-beta/devnet).");
  lines.push("- If the action is WRITE and chain/network is ambiguous: ask **one** clarifying question, then proceed.");
  lines.push("- Never mix address formats: `0x…` = EVM only; base58 = Solana only; `lnbc…` = Lightning invoice.");
  lines.push("");
  lines.push("## READ vs WRITE decision rules (strict)");
  lines.push("- Default to **READ** unless the user explicitly requests execution (verbs: send, swap, buy, sell, bridge, stake, mint, deploy, sign, approve).");
  lines.push("- If the user asks for a plan/strategy, do **READ** + simulation/preview only. Do not execute.");
  lines.push("- If a prompt contains both analysis + execution, split: do **READ** first, then invoke the WRITE tool so the native approval UI can pause execution when HITL is required.");
  lines.push("");
  lines.push("## WRITE checklist (must satisfy before any WRITE tool call)");
  lines.push("- Confirm **intent**: user explicitly wants execution now OR the user already accepted the native approval UI for this action.");
  lines.push("- Confirm **chain namespace** + **network**: EVM `chainId` or Solana `cluster`.");
  lines.push("- Confirm **addresses**: validate format; refuse mixed-chain address usage.");
  lines.push("- Confirm **amounts** + **asset** + **slippage/fees** constraints when applicable.");
  lines.push("- Refresh stale READ data if the user asked for latest/current data or changed the task after prior reads.");
  lines.push("- If prerequisite READ tools return empty/partial results, retry once with narrower args or a fallback source before blocking.");
  lines.push("- Provide a **transaction preview** and, when HITL is required, invoke the write tool so the native approval UI requests approval.");
  lines.push("");
  lines.push("## Research / analysis workflow");
  lines.push("- For market, token, NFT, or asset research: plan the key questions, fetch the strongest sources, cross-check contradictions, then synthesize with explicit risks.");
  lines.push("- Prefer internal/on-chain/market tools before web search; use web search to fill current-data gaps or confirm news/docs.");
  lines.push("");
  lines.push("# UI Artifacts (Direct Mapping)");
  lines.push("");
  lines.push("Use artifacts for long/structured outputs and reference them in your response.");

  const hasAny = (ids: string[], candidates: string[]) => candidates.some((id) => ids.includes(id));
  const hasPrefix = (ids: string[], prefixes: string[]) =>
    ids.some((id) => prefixes.some((prefix) => id.startsWith(prefix)));

  // Wallets / identity
  if (
    hasAny(normalized, ["agent_wallet_list", "evm_wallet_send_asset"]) ||
    hasAny(normalized, ["evm_wallet", "cryptowallet_evm", "bitcoin_network"])
  ) {
    lines.push("## `agent-wallets`");
    lines.push("- Use for newly created wallets, wallet inventories, and address lists (never include secrets).");
  }

  // Portfolio / holdings
  if (
    hasAny(normalized, ["wallet_get_holdings", "wallet_get_net_worth", "wallet_get_pnl"]) ||
    hasPrefix(normalized, ["mcp_moralis__evm_getwallet", "mcp_moralis__solana_getportfolio"])
  ) {
    lines.push("## `portfolio-analysis` / `combined-holdings`");
    lines.push("- Use for holdings, net worth, PnL, and allocation breakdowns.");
  }

  // Market/time series
  if (
    hasAny(normalized, ["binance_market_data", "sol_ohlcv_by_pair"]) ||
    hasPrefix(normalized, ["mcp_moralis__evm_getpaircandlesticks", "mcp_moralis__solana_getcandlesticks", "mcp_nex__aster_"])
  ) {
    lines.push("## `chart-artifact`");
    lines.push("- Use for OHLCV, indicators, levels, and chart-backed analysis.");
  }

  // Pump.fun / Solana memecoins
  if (hasAny(normalized, ["pumpfun_trader", "pumpfun_data", "pumpfun_chat"]) || hasPrefix(normalized, ["pumpfun_", "mcp_moralis__solana_gettokenbondingstatus"])) {
    lines.push("## `pumpfun`");
    lines.push("- Use for Pump.fun token analysis (bonding curve, status, trade receipts, trend reports).");
  }

  // Images
  if (hasAny(normalized, ["openai_image"])) {
    lines.push("## `image-artifact`");
    lines.push("- Use for generated images; always request confirmation if required by policy.");
  }

  // Attachments / parsing
  if (hasAny(normalized, ["openai_file_search", "openai_code_interpreter"])) {
    lines.push("## `file-analysis`");
    lines.push("- Use for attachment summaries, extracted snippets, and structured parsing results.");
  }

  // Tables
  lines.push("## `table-editor`");
  lines.push("- Use for long tables, screeners, CSV-style outputs, and comparison matrices.");
  lines.push("## `market-terminal`");
  lines.push("- Use for crypto screening, ranking, shortlist review, pivoting, and live trade tape collaboration.");

  return lines.join("\n");
};

export const buildToolGuide = async (options: BuildToolGuideOptions = {}): Promise<string> => {
  const spec = await resolveToolsSpec();
  const allowedTools = spec.allowed_tools ?? [];
  const includeDescriptions = options.includeDescriptions ?? true;
  const includeActionMap = options.includeActionMap ?? true;
  const automationSummary =
    typeof options.automationSummary === "string" && options.automationSummary.trim().length > 0
      ? options.automationSummary.trim()
      : null;

  const requestedToolIds =
    Array.isArray(options.toolIds) && options.toolIds.length > 0
      ? filterBlockedToolIds(
          uniq(options.toolIds).filter(
            (id) => typeof id === "string" && id.trim().length > 0,
          ),
        )
      : null;

  const allowedLine =
    requestedToolIds && requestedToolIds.length > 0
      ? `Tools in scope (${requestedToolIds.length}): ${requestedToolIds.join(", ")}`
      : allowedTools.length > 0
        ? `Allowed tools (${allowedTools.length}): ${allowedTools.join(", ")}`
        : "Allowed tools: none declared.";

  const allTools = spec.tools ?? [];
  const toolDefsById = new Map(allTools.filter((t) => Boolean(t?.id)).map((t) => [t.id, t]));

  const selectedTools: ToolDefinition[] = requestedToolIds
    ? requestedToolIds.map((id) => toolDefsById.get(id)).filter((t): t is ToolDefinition => Boolean(t))
    : allTools;

  const toolSummaries = includeDescriptions
    ? selectedTools.map((tool) => {
        const approval =
          tool.approval && tool.approval !== "none" ? ` [${tool.approval}]` : "";
        return `- ${tool.id}${approval}: ${tool.description ?? "No description provided."}`;
      })
    : [];

  const rules = spec.tool_use_rules ?? {};
  const ruleLines: string[] = [];

  if (rules.pre_call_template) {
    ruleLines.push(`pre_call_template → ${rules.pre_call_template}`);
  }
  if (rules.post_call_validate) {
    ruleLines.push(`post_call_validate → ${rules.post_call_validate}`);
  }
  if (rules.confirmation_required_for?.length) {
    ruleLines.push(
      `confirmation_required_for → ${rules.confirmation_required_for.join(", ")}`,
    );
  }
  if (typeof rules.preview_artifact_required === "boolean") {
    ruleLines.push(
      `preview_artifact_required → ${rules.preview_artifact_required}`,
    );
  }
  if (rules.default_retry_policy && Object.keys(rules.default_retry_policy).length > 0) {
    ruleLines.push(
      `default_retry_policy → ${JSON.stringify(rules.default_retry_policy)}`,
    );
  }

  const sections = [
    `# Tool Registry (tools.json v${spec.version ?? "unknown"})`,
    spec.agent ? `Agent: ${spec.agent}` : null,
    allowedLine,
    automationSummary ? `Automation: ${automationSummary}` : null,
    toolSummaries.length ? `Tool descriptions:\n${toolSummaries.join("\n")}` : null,
    includeActionMap
      ? buildDirectActionMap(requestedToolIds ?? allowedTools, toolDefsById)
      : null,
    buildMoralisMcpGuide(requestedToolIds ?? allowedTools),
    ruleLines.length ? `Tool use rules:\n${ruleLines.join("\n")}` : null,
  ].filter(Boolean);

  const toolGuide = sections.join("\n\n");
  return toolGuide;
};

export const buildOpenAIFunctionTools = async (): Promise<Array<OpenAIFunctionTool>> => {
  const spec = await resolveToolsSpec();
  const tools = Array.isArray(spec.tools) ? spec.tools : [];

  return tools
    .filter((tool): tool is ToolDefinition & { id: string } => Boolean(tool?.id))
    .map((tool): OpenAIFunctionTool => {
      const parameters =
        tool.input_schema && typeof tool.input_schema === "object"
          ? tool.input_schema
          : { type: "object", properties: {} };

      return {
        type: "function",
        function: {
          name: tool.id,
          description: tool.description ?? undefined,
          parameters,
        },
      };
    });
};

import { createClient } from "@/server/services/supabase/server";
import { getMcpServer } from "@/lib/mcp/registry";


import { logger } from '@/lib/logger';
export const resolveNativeTools = async (): Promise<Array<Record<string, UntypedJson>>> => {
  // Get vector store IDs from environment or use default
  const vectorStoreIds = process.env.OPENAI_FILE_SEARCH_VECTOR_STORE_IDS
    ? process.env.OPENAI_FILE_SEARCH_VECTOR_STORE_IDS.split(",").map(id => id.trim()).filter(Boolean)
    : ["vs_691aed817ac88191b2452b19c137f379"]; // Default fallback
  
  const tools: Array<Record<string, UntypedJson>> = [
    {
      type: "file_search",
      // OpenAI Responses API requires file_search config nested under file_search key
      file_search: {
        vector_store_ids: vectorStoreIds,
      },
    },
    {
      type: "web_search_preview",
      search_context_size: "medium",
      user_location: {
        type: "approximate",
        city: null,
        country: "US",
        region: null,
        timezone: null,
        timeZone: "America/New_York",
      },
    },
    {
      // code_interpreter uses simpler format - no nested config needed
      type: "code_interpreter",
    },
    {
      // OpenAI Responses API requires image_generation config nested under image_generation key
      type: "image_generation",
      image_generation: {
        background: "auto",
        model: "gpt-image-1",
        moderation: "auto",
        output_compression: 100,
        output_format: "png",
        quality: "auto",
        size: "auto",
      },
    },
    // We can now append dynamic MCP tools here if they are configured as "native" types
    // or keep the hardcoded ones as fallbacks.
    {
      type: "mcp",
      allowed_tools: ["read_wiki_structure", "read_wiki_contents", "ask_question"],
      headers: null,
      require_approval: "always",
      server_description: null,
      server_label: "deepwiki",
      server_url: "https://mcp.deepwiki.com/mcp",
    },
    {
      type: "mcp",
      allowed_tools: [
        "web_search_exa",
        "company_research_exa",
        "crawling_exa",
        "linkedin_search_exa",
        "deep_researcher_start",
        "deep_researcher_check",
        "get_code_context_exa",
      ],
      authorization: "REDACTED",
      headers: null,
      require_approval: "never",
      server_description: "Exa Web Search tool",
      server_label: "exa",
      server_url:
        "https://mcp.exa.ai/mcp?tools=web_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check",
    },
  ];

  // Dynamically fetch installed MCP tools for the current user
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: installations } = await supabase
          .from("user_mcp_installations")
          .select("*")
          .eq("user_id", user.id);

        if (installations && installations.length > 0) {
          await Promise.all(installations.map(async (inst) => {
             const server = await getMcpServer(inst.server_name);
             if (server && server.source.type === "http") {
                tools.push({
                   type: "mcp",
                   allowed_tools: undefined, // Allow all tools by default for now
                   headers: inst.config?.headers || null,
                   authorization: inst.config?.authorization || null,
                   require_approval: "dynamic",
                   server_description: server.description,
                   server_label: server.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                   server_url: server.source.location
                });
             }
          }));
        }
      }
    }
  } catch (error) {
     logger.warn("[system-guidance] Failed to load user MCP installations", error);
  }

  return tools;
};

export type { ToolsSpec, ToolDefinition, ToolUseRules };
