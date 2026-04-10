import { defaultEvmWalletMcpClient, type EvmWalletToolName } from "@/server/services/mcp/evm-wallet-client";
import { extractNumberFromLine, parseEvmWalletResult, type ParsedEvmWalletResult } from "@/server/services/mcp/evm-wallet-utils";
import { persistAgentWallet, listStoredWallets } from "@/server/wallets/wallet-store";
import { invalidateProfileAggregate } from "@/server/profile/profile-cache";
import type { ApprovalPayload, AutonomousAction } from "@/lib/approvals/state-machine";
import { WALLET_PERSIST_COMMANDS } from "./types";


import { logger } from '@/lib/logger';
export const argsArrayToRecord = (
    args: Array<{ key: string; value: UntypedJson }> | Record<string, UntypedJson>
): Record<string, UntypedJson> => {
    if (!Array.isArray(args)) {
        return args as Record<string, UntypedJson>;
    }

    return args.reduce((acc, { key, value }) => {
        if (
            Array.isArray(value) &&
            value.every(
                (item): item is { key: string; value: UntypedJson } =>
                    typeof item === "object" &&
                    item !== null &&
                    "key" in item &&
                    "value" in item
            )
        ) {
            acc[key] = argsArrayToRecord(value);
        } else {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, UntypedJson>);
};

export function normalizeAutonomousAction(value: UntypedJson): AutonomousAction | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.toLowerCase();
    if (normalized.includes("bridge")) return "bridge";
    if (normalized.includes("deploy")) return "deploy";
    if (normalized.includes("stake")) return "stake";
    if (normalized.includes("sell")) return "sell";
    if (normalized.includes("buy")) return "buy";
    return undefined;
}

export function safeStringify(value: UntypedJson): string {
    try {
        return JSON.stringify(value, (_, v) =>
            typeof v === "bigint" ? v.toString() : v
        );
    } catch {
        return "";
    }
}

export function inferAutonomousAction(
    command: string,
    args: Record<string, UntypedJson>
): AutonomousAction | undefined {
    const directKeys = [
        "operationType",
        "autonomousAction",
        "intent",
        "action",
        "mode",
        "category",
    ];
    for (const key of directKeys) {
        const candidate = normalizeAutonomousAction(args?.[key]);
        if (candidate) return candidate;
    }

    const commandAction = normalizeAutonomousAction(command);
    if (commandAction) return commandAction;

    const serialized = safeStringify(args).toLowerCase();
    if (!serialized) return undefined;
    if (serialized.includes("bridge") || serialized.includes("debridge"))
        return "bridge";
    if (serialized.includes("staking") || serialized.includes("stake"))
        return "stake";
    if (
        serialized.includes('"side":"sell"') ||
        serialized.includes("sellamount") ||
        serialized.includes('"sell"')
    )
        return "sell";
    if (
        serialized.includes('"side":"buy"') ||
        serialized.includes("buyamount") ||
        serialized.includes('"buy"')
    )
        return "buy";
    if (serialized.includes("deploy")) return "deploy";

    return undefined;
}

export function generateTransactionPreview(
    command: string,
    args: Record<string, UntypedJson>
): ApprovalPayload["preview"] {
    switch (command) {
        case "wallet_send_transaction": {
            const to = (args.to as string) || "Unknown";
            const value = args.value as string | undefined;
            const data = args.data as string | undefined;
            const gasPrice = args.gasPrice as string | undefined;
            const gasLimit = args.gasLimit as string | number | undefined;

            const items = [
                { label: "To Address", value: to, highlight: true },
                ...(value ? [{ label: "Value (wei)", value, highlight: true }] : []),
                ...(data
                    ? [{ label: "Data", value: `${data.slice(0, 20)}...`, highlight: false }]
                    : []),
                ...(gasPrice
                    ? [{ label: "Gas Price (gwei)", value: gasPrice.toString() }]
                    : []),
                ...(gasLimit ? [{ label: "Gas Limit", value: gasLimit.toString() }] : []),
            ];

            let estimatedCost;
            if (gasPrice && gasLimit) {
                const gasCost = BigInt(gasPrice) * BigInt(gasLimit);
                estimatedCost = {
                    amount: gasCost.toString(),
                    currency: "wei",
                };
            }

            return {
                title: "Send Transaction",
                description: "Execute a transaction on the Ethereum network.",
                items,
                warnings: [
                    "This transaction is irreversible once confirmed on-chain.",
                    "Verify the recipient address carefully before approving.",
                    "Ensure you have sufficient balance to cover the transaction and gas costs.",
                ],
                estimatedCost,
            };
        }

        case "wallet_sign_transaction": {
            const to = (args.to as string) || "Unknown";
            const value = args.value as string | undefined;

            return {
                title: "Sign Transaction",
                description: "Sign a transaction without broadcasting it.",
                items: [
                    { label: "To Address", value: to, highlight: true },
                    ...(value ? [{ label: "Value (wei)", value, highlight: true }] : []),
                ],
                warnings: [
                    "Signing a transaction gives authorization to broadcast it.",
                    "Only sign transactions you trust.",
                ],
            };
        }

        case "wallet_sign_message": {
            const message = (args.message as string) || "";
            const truncated =
                message.length > 100 ? `${message.slice(0, 100)}...` : message;

            return {
                title: "Sign Message",
                description: "Sign a message with your wallet's private key.",
                items: [{ label: "Message", value: truncated, highlight: true }],
                warnings: [
                    "Only sign messages from sources you trust.",
                    "Malicious signatures can be used for phishing attacks.",
                    "This signature can be used to prove you control this wallet address.",
                ],
            };
        }

        case "wallet_sign_typed_data": {
            const domain = args.domain as Record<string, UntypedJson> | undefined;
            const message = args.message as Record<string, UntypedJson> | undefined;

            return {
                title: "Sign Typed Data (EIP-712)",
                description: "Sign structured data (EIP-712 standard).",
                items: [
                    ...(domain
                        ? [{ label: "Domain", value: JSON.stringify(domain).slice(0, 50) }]
                        : []),
                    ...(message
                        ? [
                            {
                                label: "Message",
                                value: JSON.stringify(message).slice(0, 50),
                                highlight: true,
                            },
                        ]
                        : []),
                ],
                warnings: [
                    "EIP-712 signatures can authorize complex contract interactions.",
                    "Verify the domain and message content carefully.",
                    "Common use case: DEX permit signatures, token approvals.",
                ],
            };
        }

        case "wallet_bridge_assets": {
            const amount = args.amount as string | undefined;
            const token = (args.token as string) || "native asset";
            const fromChainId = args.chainId as string | number | undefined;
            const toChainId = args.toChainId as string | number | undefined;
            const destinationAddress = (args.toAddress as string) || "Same address";
            const router = args.router as string | undefined;

            return {
                title: "Bridge Assets",
                description: "Bridge assets from the source chain to a destination chain.",
                items: [
                    ...(amount ? [{ label: "Amount", value: amount, highlight: true }] : []),
                    { label: "Asset", value: token, highlight: true },
                    ...(fromChainId != null
                        ? [{ label: "From Chain", value: String(fromChainId) }]
                        : []),
                    ...(toChainId != null
                        ? [{ label: "To Chain", value: String(toChainId) }]
                        : []),
                    {
                        label: "Destination Address",
                        value: destinationAddress,
                        highlight: true,
                    },
                    ...(router ? [{ label: "Router", value: router }] : []),
                ],
                warnings: [
                    "Bridging can take time and may involve third-party relayers or routers.",
                    "Verify the destination chain, token format, and recipient address before approving.",
                    "Fees and final received amount can differ from the submitted amount.",
                ],
            };
        }

        case "wallet_swap_tokens": {
            const protocol = args.protocol as string | undefined;
            const tokenIn = (args.tokenIn as string) || "Unknown input token";
            const tokenOut = (args.tokenOut as string) || "Unknown output token";
            const amountIn = args.amountIn as string | undefined;
            const minAmountOut = args.minAmountOut as string | undefined;

            return {
                title: "Swap Tokens",
                description: "Swap one token for another using the selected protocol.",
                items: [
                    { label: "Input Token", value: tokenIn, highlight: true },
                    { label: "Output Token", value: tokenOut, highlight: true },
                    ...(amountIn ? [{ label: "Amount In", value: amountIn, highlight: true }] : []),
                    ...(minAmountOut ? [{ label: "Minimum Out", value: minAmountOut }] : []),
                    ...(protocol ? [{ label: "Protocol", value: protocol }] : []),
                ],
                warnings: [
                    "Swap pricing can move before the transaction confirms.",
                    "Verify slippage tolerance and minimum received amount before approving.",
                    "Some swaps require token approvals before execution.",
                ],
            };
        }

        default:
            return {
                title: "Approve Action",
                description: `You are about to execute: ${command}`,
                items: Object.entries(args)
                    .slice(0, 5)
                    .map(([key, value]) => ({
                        label: key,
                        value: String(value).slice(0, 50),
                    })),
            };
    }
}

export type AuthContext = {
    userId: string | null;
};

export type AuthResolver = () => Promise<AuthContext>;

export function createAuthResolver(): AuthResolver {
    let cached: Promise<AuthContext> | null = null;
    return async () => {
        if (!cached) {
            cached = resolveAuthContext();
        }
        return cached;
    };
}

export async function resolveAuthContext(): Promise<AuthContext> {
    try {
        const { createClient } = await import("@/server/services/supabase/server");
        const supabase = await createClient();
        if (!supabase) {
            return { userId: null };
        }
        const {
            data: { user },
        } = await supabase.auth.getUser();
        return { userId: user?.id ?? null };
    } catch (error) {
        logger.error("[EVM Wallet] Failed to resolve auth context", error);
        return { userId: null };
    }
}

type PersistOptions = {
    command: EvmWalletToolName;
    args: Record<string, UntypedJson>;
    providerURL?: string;
    invocationText: string;
    ensureAuthContext: AuthResolver;
};

export async function maybePersistWallet({
    command,
    args,
    providerURL,
    invocationText,
    ensureAuthContext,
}: PersistOptions) {
    if (!WALLET_PERSIST_COMMANDS.has(command)) {
        return;
    }

    try {
        const { userId } = await ensureAuthContext();
        if (!userId) {
            return;
        }

        const parsed = parseEvmWalletResult(invocationText);
        const address = parsed.address.toLowerCase();

        const existing = await listStoredWallets(userId).catch(() => []);
        if (existing.some((wallet) => wallet.address?.toLowerCase() === address)) {
            return;
        }

        const chainId = await resolveChainId(parsed, args, providerURL);
        const label = sanitizeLabel(args.label);
        const normalizedProvider =
            typeof providerURL === "string"
                ? providerURL
                : sanitizeProvider(args.providerURL);

        await persistAgentWallet(userId, {
            chainId,
            address: parsed.address,
            label,
            providerURL: normalizedProvider ?? undefined,
            privateKey: parsed.privateKey,
            mnemonic: parsed.mnemonic,
            encryptedJson: parsed.encryptedJson,
            metadata: buildWalletMetadata(command, parsed.publicKey, normalizedProvider),
        });

        await invalidateProfileAggregate(userId).catch(() => { });
    } catch (error) {
        logger.error("[EVM Wallet] Failed to persist MCP-created wallet", error);
    }
}

export function sanitizeLabel(value: UntypedJson): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed.slice(0, 120);
}

export function sanitizeProvider(value: UntypedJson): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export function buildWalletMetadata(
    command: EvmWalletToolName,
    publicKey: string | null,
    providerURL: string | null
) {
    const metadata: Record<string, UntypedJson> = {
        source: "mcp-cryptowallet-evm",
        command,
    };
    if (publicKey) {
        metadata.publicKey = publicKey;
    }
    if (providerURL) {
        metadata.providerURL = providerURL;
    }
    return metadata;
}

export async function resolveChainId(
    parsed: ParsedEvmWalletResult,
    args: Record<string, UntypedJson>,
    providerURL?: string
): Promise<number> {
    const explicit = args.chainId;
    if (
        typeof explicit === "number" &&
        Number.isFinite(explicit) &&
        explicit > 0
    ) {
        return Math.trunc(explicit);
    }

    const walletSource = getWalletSource(parsed);
    if (!walletSource) {
        return 1;
    }

    try {
        if (providerURL) {
            await defaultEvmWalletMcpClient.invokeRaw("wallet_provider_set", {
                providerURL,
            });
        }

        const response = await defaultEvmWalletMcpClient.invokeRaw(
            "wallet_get_chain_id",
            {
                wallet: walletSource,
            }
        );
        if (!response.ok) {
            return 1;
        }
        const chainId = extractNumberFromLine(response.text, "Chain ID");
        return chainId && Number.isFinite(chainId) ? Math.trunc(chainId) : 1;
    } catch (error) {
        logger.warn("[EVM Wallet] Unable to resolve chain ID", error);
        return 1;
    }
}

export function getWalletSource(parsed: ParsedEvmWalletResult): string | null {
    if (parsed.privateKey) return parsed.privateKey;
    if (parsed.mnemonic) return parsed.mnemonic;
    return null;
}
