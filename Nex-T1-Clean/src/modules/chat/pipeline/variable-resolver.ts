import { createClient } from "@/server/services/supabase/server";
import { fetchTasksForUser } from "@/server/tasks/repository";
import { fetchDefaultWatchlist } from "@/modules/watchlist/service";
import { resolveToolBudget } from "@/lib/constants/billing-limits";
import type { PipelineContext } from "./context-builder";
import { DEFAULT_CHAIN_CONTEXT, DEFAULT_DAO_CONTEXT } from "@/modules/ai/chatbot/constants";
import { extractLatestUserMessage } from "./request-normalization";


import { logger } from '@/lib/logger';
export type VariableResolverOptions = {
    skipMemoryFetch?: boolean;
    skipTasksFetch?: boolean;
    skipWatchlistFetch?: boolean;
};

export class VariableResolver {
    static async resolve(
        context: PipelineContext,
        options: VariableResolverOptions = {}
    ): Promise<Record<string, string>> {
        const { auth, walletSnapshot, username, request } = context;
        const userId = auth.userId;
        const latestUserMessage = extractLatestUserMessage(request.messages);

        const parseWalletSnapshot = (snapshot: string | null | undefined) => {
            const text = typeof snapshot === "string" ? snapshot : "";
            const evmMatches = Array.from(new Set((text.match(/0x[a-fA-F0-9]{40}\b/g) ?? []).map((a) => a)));

            // Heuristic Solana address matcher (base58-ish, 32-44 chars) gated by SOL-ish keywords
            const solCandidates = Array.from(
                new Set(text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) ?? []),
            );
            const solMatches = solCandidates.filter((addr) => {
                if (addr.startsWith("0x")) return false;
                // Prefer addresses that appear on lines referencing Solana/SOL
                const idx = text.indexOf(addr);
                const window = idx >= 0 ? text.slice(Math.max(0, idx - 80), idx + addr.length + 80).toLowerCase() : "";
                return window.includes("sol") || window.includes("solana") || window.includes("(sol") || window.includes("helius");
            });

            let safeWallet: string | null = null;
            const lines = text.split("\n");
            for (const line of lines) {
                if (!/safe/i.test(line)) continue;
                const match = line.match(/0x[a-fA-F0-9]{40}\b/);
                if (match) {
                    safeWallet = match[0];
                    break;
                }
            }

            return {
                evmAddresses: evmMatches,
                solanaAddresses: solMatches,
                safeWalletAddress: safeWallet,
            };
        };

        const inferChainFromMessage = (
            message: string, 
            parsed: ReturnType<typeof parseWalletSnapshot>,
            browsingHistory: typeof request.browsingHistory
        ) => {
            const text = (message ?? "").toLowerCase();
            const evmAddressMatch = message.match(/0x[a-fA-F0-9]{40}\b/);
            const solCandidates = Array.from(new Set(message.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g) ?? []));
            const solAddressMatch = solCandidates.find((addr) => !addr.startsWith("0x"));

            const hasSolKeywords = /\bsol\b|solana|pump\.fun|jupiter|raydium|orca|meteora|helius|solscan/.test(text);
            const hasEvmKeywords = /\beth\b|ethereum|evm|erc-?20|uniswap|aave|base\b|arbitrum|optimism|polygon|bsc|bnb\b|avalanche|avax\b|celo|monad|etherscan|basescan|arbiscan/.test(text);
            const hasBtcKeywords = /\bbtc\b|bitcoin|lightning|lnbc|sats?\b/.test(text);
            const hasXrpKeywords = /\bxrp\b|ripple|xrpl|xrp\s+ledger/.test(text);
            const hasNearKeywords = /\bnear\b|\.near\b|near\s+protocol/.test(text);

            const cluster: "mainnet-beta" | "devnet" | null =
                /\bdevnet\b|\btestnet\b/.test(text) ? "devnet" : hasSolKeywords ? "mainnet-beta" : null;

            const evmNetworkToChainId: Record<string, number> = {
                ethereum: 1, mainnet: 1, base: 8453, arbitrum: 42161,
                optimism: 10, polygon: 137, bsc: 56, bnb: 56,
                avalanche: 43114, avax: 43114, celo: 42220, monad: 143,
            };

            const evmNetwork =
                Object.keys(evmNetworkToChainId).find((key) => new RegExp(`\\b${key}\\b`).test(text)) ?? null;
            const evmChainId = evmNetwork ? evmNetworkToChainId[evmNetwork] : null;

            // 1. Strong Message Signals
            if (hasBtcKeywords) return { namespace: "bitcoin" as const, confidence: "medium" as const, reason: "bitcoin keywords", cluster: null, evmChainId: null };
            if (hasXrpKeywords) return { namespace: "xrp" as const, confidence: "medium" as const, reason: "xrp keywords", cluster: null, evmChainId: null };
            if (hasNearKeywords) return { namespace: "near" as const, confidence: "medium" as const, reason: "near keywords", cluster: null, evmChainId: null };
            if (evmAddressMatch || hasEvmKeywords) return { namespace: "evm" as const, confidence: evmAddressMatch ? "high" : "medium", reason: evmAddressMatch ? "0x address" : "evm keywords", cluster: null, evmChainId };
            if (solAddressMatch || hasSolKeywords) return { namespace: "solana" as const, confidence: solAddressMatch ? "high" : "medium", reason: solAddressMatch ? "base58 address" : "solana keywords", cluster: cluster ?? "mainnet-beta", evmChainId: null };

            // 2. Browsing Context Signals (if message is ambiguous)
            if (browsingHistory && browsingHistory.length > 0) {
                const latest = browsingHistory[0];
                const latestText = (latest.title + " " + latest.url).toLowerCase();
                
                // Solana Browsing Signals
                if (/\bsolscan\b|pump\.fun|jupiter|raydium|helius|solana/.test(latestText)) {
                     return { namespace: "solana" as const, confidence: "medium" as const, reason: "browsing context (solana)", cluster: "mainnet-beta" as const, evmChainId: null };
                }
                // EVM Browsing Signals
                if (/\betherscan\b|basescan\b|uniswap|aave|opensea|base\.org/.test(latestText)) {
                     const isBase = /\bbase\b/.test(latestText);
                     return { namespace: "evm" as const, confidence: "medium" as const, reason: "browsing context (evm)", cluster: null, evmChainId: isBase ? 8453 : 1 };
                }
            }

            // 3. Wallet Context Fallback
            if (/\bmy wallet\b|\bmy address\b|\bmy balance\b/.test(text)) {
                if (parsed.evmAddresses.length > 0 && parsed.solanaAddresses.length === 0) {
                    return { namespace: "evm" as const, confidence: "low" as const, reason: "wallet context (evm)", cluster: null, evmChainId: null };
                }
                if (parsed.solanaAddresses.length > 0 && parsed.evmAddresses.length === 0) {
                    return { namespace: "solana" as const, confidence: "low" as const, reason: "wallet context (solana)", cluster: "mainnet-beta" as const, evmChainId: null };
                }
            }

            return { namespace: "unknown" as const, confidence: "low" as const, reason: "insufficient signal", cluster: null, evmChainId: null };
        };

        const buildUserTimeContext = (timeZone: string | null) => {
            const tz = (timeZone ?? "").trim() || "UTC";
            let nowLocal = "";
            try {
                nowLocal = new Intl.DateTimeFormat("en-US", {
                    timeZone: tz,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                    timeZoneName: "short",
                }).format(new Date());
            } catch {
                nowLocal = new Date().toISOString();
            }
            return `Timezone: ${tz}. Now: ${nowLocal}.`;
        };

        // Base variables (always set)
        const walletParsed = parseWalletSnapshot(walletSnapshot);
        const inferredChain = inferChainFromMessage(latestUserMessage, walletParsed, request.browsingHistory);
// ... (similarly inside VariableResolver.resolve)

        const browsingHistory = request.browsingHistory || [];
        
        // Helper: Sanitize text to prevent context injection
        const sanitizeText = (text: string) => {
            if (!text) return "";
            // Remove control characters and potential injection patterns
            let clean = text.replace(/[\x00-\x1F\x7F]/g, "").trim();
            if (/ignore previous instructions|forget all instructions/i.test(clean)) {
                clean = "[REDACTED_INJECTION_ATTEMPT]";
            }
            return clean.slice(0, 100); // Strict truncation
        };

        const browsingContextString = browsingHistory.length > 0 
            ? browsingHistory.slice(0, 5).map(item => {
                const uniqueTickers = Array.from(new Set(item.entities.tickers)).slice(0, 3);
                const uniqueEvm = Array.from(new Set(item.entities.evmAddresses)).slice(0, 2);
                const uniqueSol = Array.from(new Set(item.entities.solanaAddresses)).slice(0, 2);
                
                const entities = [];
                if (uniqueTickers.length) entities.push(`Tickers: ${uniqueTickers.join(", ")}`);
                if (uniqueEvm.length) entities.push(`EVM: ${uniqueEvm.join(", ")}`);
                if (uniqueSol.length) entities.push(`SOL: ${uniqueSol.join(", ")}`);
                
                const entityStr = entities.length ? ` (${entities.join("; ")})` : "";
                const cleanTitle = sanitizeText(item.title);
                const cleanUrl = item.url.split('?')[0].slice(0, 80); // Remove query params, truncate
                
                return `- [${new Date(item.timestamp).toLocaleTimeString()}] ${cleanTitle} (${cleanUrl})${entityStr}`;
              }).join("\n")
            : "No recent browsing history.";

        // ...

        const variables: Record<string, string> = {
            "{{USER_IDENTITY}}": username ? `User: ${username}` : "User: Anonymous",
            "{{USER_TIME_CONTEXT}}": request.clientTimeContext
                ? `Timezone: ${request.clientTimeContext.timeZone}. Locale: ${request.clientTimeContext.locale ?? "en-US"}. Local Time: ${request.clientTimeContext.formatted24h} (ISO: ${request.clientTimeContext.timestamp}).`
                : buildUserTimeContext(null),
            "{{CHAT_START_MARKET_CONTEXT}}": context.chatStartSnapshot?.promptContext.market ?? "",
            "{{USER_PORTFOLIO_CONTEXT}}": context.chatStartSnapshot?.promptContext.portfolio ?? "",
            "{{USER_BROWSING_CONTEXT}}": `Recent Activity:\n${browsingContextString}`,
            "{{WALLET_CONTEXT}}": walletSnapshot || "",
            // ...
            "{{WALLET_ADDRESSES}}": walletParsed.evmAddresses.length
                ? `EVM wallets: ${walletParsed.evmAddresses.slice(0, 6).join(", ")}`
                : "",
            "{{SAFE_WALLET_ADDRESS}}": walletParsed.safeWalletAddress ? `Safe wallet: ${walletParsed.safeWalletAddress}` : "",
            "{{SOLANA_WALLETS}}": walletParsed.solanaAddresses.length
                ? `Solana wallets: ${walletParsed.solanaAddresses.slice(0, 3).join(", ")}`
                : "",
            "{{CHAIN_CONTEXT}}": DEFAULT_CHAIN_CONTEXT,
            "{{IMPLIED_CHAIN}}": (() => {
                if (inferredChain.namespace === "unknown") return "";
                if (inferredChain.namespace === "bitcoin") return `Implied chain: Bitcoin (signal: ${inferredChain.reason}).`;
                if (inferredChain.namespace === "xrp") return `Implied chain: XRP Ledger (signal: ${inferredChain.reason}).`;
                if (inferredChain.namespace === "near") return `Implied chain: NEAR Protocol (signal: ${inferredChain.reason}).`;
                if (inferredChain.namespace === "solana") return `Implied chain: Solana (${inferredChain.cluster ?? "mainnet-beta"}) (signal: ${inferredChain.reason}).`;
                const chainIdText = inferredChain.evmChainId ? ` chainId=${inferredChain.evmChainId}` : "";
                return `Implied chain: EVM${chainIdText} (signal: ${inferredChain.reason}).`;
            })(),
            "{{DAO_CONTEXT}}": DEFAULT_DAO_CONTEXT,
            "{{TOOL_MAX_INVOCATIONS}}": (() => {
                const envOverride = process.env.NEX_TOOL_MAX_INVOCATIONS;
                if (envOverride) return String(Number(envOverride));
                const budget = resolveToolBudget(context.userPlan);
                return String(budget.maxInvocations);
            })(),
            "{{TOOL_MAX_CONCURRENT}}": (() => {
                const envOverride = process.env.NEX_TOOL_MAX_CONCURRENT;
                if (envOverride) return String(Number(envOverride));
                const budget = resolveToolBudget(context.userPlan);
                return String(budget.maxConcurrent);
            })(),
            "{{TASK_CONTEXT}}": "",
            "{{WATCHLIST_CONTEXT}}": "",
            "{{USER_PREFERENCES}}": context.memorySnapshot.preferences
                ? `Preferences: ${context.memorySnapshot.preferences}`
                : "",
            "{{MEMORY_SHORT}}": context.memorySnapshot.shortTerm
                ? `Recent: ${context.memorySnapshot.shortTerm}`
                : "",
            "{{MEMORY_LONG}}": context.memorySnapshot.longTerm
                ? `Memory: ${context.memorySnapshot.longTerm}`
                : "",
            "{{WORKING_MEMORY_TODOS}}": context.memorySnapshot.summary || "Working memory: no active todos.",
        };

        // Fast path: return minimal variables if no user or all fetches skipped
        if (!userId) {
            return variables;
        }

        const {
            skipMemoryFetch = false,
            skipTasksFetch = false,
            skipWatchlistFetch = false
        } = options;

        try {
            // Build fetch list based on options (parallel execution)
            const fetchPromises: Promise<void>[] = [];

            // Create client once for reuse
            const supabase = await createClient();

            // Profile (username, timezone) - keeps personalization consistent even when ContextBuilder has no identity
            fetchPromises.push(
                (async () => {
                    if (!supabase || !userId) return;
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("display_name, username, time_zone, locale, metadata")
                        .eq("id", userId)
                        .maybeSingle();

                    const profileUsername =
                        (typeof profile?.username === "string" && profile.username.trim().length > 0
                            ? profile.username.trim()
                            : null) ??
                        (typeof profile?.display_name === "string" && profile.display_name.trim().length > 0
                            ? profile.display_name.trim()
                            : null);

                    const metadata = profile?.metadata as Record<string, UntypedJson> | undefined;
                    const userRole = typeof metadata?.user_role === "string" ? metadata.user_role : null;
                    const tonePreference = typeof metadata?.tone_preference === "string" ? metadata.tone_preference : null;
                    const defaultChain = typeof metadata?.default_chain === "string" ? metadata.default_chain : null;

                    if (profileUsername) {
                        let identityString = `User: ${profileUsername}`;
                        if (userRole) {
                            identityString += ` (Role: ${userRole})`;
                        }
                        variables["{{USER_IDENTITY}}"] = identityString;
                    }

                    // Build preferences string
                    const preferences: string[] = [];
                    if (tonePreference) {
                        preferences.push(`Tone: ${tonePreference}`);
                    }
                    if (defaultChain) {
                        preferences.push(`Default Chain: ${defaultChain}`);
                    }
                    
                    if (preferences.length > 0) {
                         variables["{{USER_PREFERENCES}}"] = `Preferences: ${preferences.join(" | ")}`;
                    }

                    const tz =
                        typeof profile?.time_zone === "string" && profile.time_zone.trim().length > 0
                            ? profile.time_zone.trim()
                            : null;
                    variables["{{USER_TIME_CONTEXT}}"] = context.request.clientTimeContext
                        ? `Timezone: ${context.request.clientTimeContext.timeZone}. Locale: ${context.request.clientTimeContext.locale ?? "en-US"}. Local Time: ${context.request.clientTimeContext.formatted24h} (ISO: ${context.request.clientTimeContext.timestamp}).`
                        : buildUserTimeContext(tz);
                })().catch(() => { }),
            );

            // Tasks (only if not skipped)
            if (!skipTasksFetch) {
                fetchPromises.push(
                    fetchTasksForUser(userId, { status: "pending", limit: 3 }, supabase ?? undefined)
                        .then((result) => {
                            if (result?.tasks?.length > 0) {
                                const taskList = result.tasks
                                    .slice(0, 3)
                                    .map((t) => `- ${t.title}`)
                                    .join("\n");
                                variables["{{TASK_CONTEXT}}"] = `Tasks:\n${taskList}`;
                            }
                        })
                        .catch(() => { })
                );
            }

            // Watchlist (only if not skipped)
            if (!skipWatchlistFetch) {
                fetchPromises.push(
                    (async () => {
                        if (!supabase) return;
                        const result = await fetchDefaultWatchlist(supabase, userId);
                        if (result?.items && result.items.length > 0) {
                            const items = result.items
                                .slice(0, 5)
                                .map((i) => `${i.symbol}: $${i.lastPrice?.toFixed(2) ?? "?"}`)
                                .join(", ");
                            variables["{{WATCHLIST_CONTEXT}}"] = `Watching: ${items}`;
                        }
                    })().catch(() => { })
                );
            }

            // Memory is resolved centrally by buildMemorySnapshot and injected via PipelineContext.
            if (!skipMemoryFetch) {
                variables["{{MEMORY_SHORT}}"] = context.memorySnapshot.shortTerm
                    ? `Recent: ${context.memorySnapshot.shortTerm}`
                    : variables["{{MEMORY_SHORT}}"];
                variables["{{MEMORY_LONG}}"] = context.memorySnapshot.longTerm
                    ? `Memory: ${context.memorySnapshot.longTerm}`
                    : variables["{{MEMORY_LONG}}"];
                variables["{{USER_PREFERENCES}}"] = context.memorySnapshot.preferences
                    ? `Preferences: ${context.memorySnapshot.preferences}`
                    : variables["{{USER_PREFERENCES}}"];
            }

            await Promise.all(fetchPromises);
        } catch (error) {
            logger.error("[VariableResolver] Failed to resolve variables", error);
        }

        return variables;
    }
}
