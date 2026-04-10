import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
    buyTokens,
    createAndBuyToken,
    generateOperationId,
    getBondingCurveAccount,
    getDefaultPriorityFees,
    getGlobalAccount,
    getPumpFunConnection,
    sellTokens,
    type PumpFunPriorityFee,
} from "@/modules/wallets/pumpfun/service";
import { formatSolanaTokenAmount, toLamports } from "@/modules/wallets/solana/utils";
import { createPumpFunArtifact, type PumpFunArtifactData } from "@/modules/ai/artifacts/pumpfun";
import {
    type Cluster,
    type PriorityFeeInput,
    type PumpFunToolResponse,
    type PumpFunTraderInput,
    type WalletInput,
} from "./types";
import { createTradeArtifactEnvelope } from "./artifact";

// ============================================================================
// HELPERS
// ============================================================================

function decodeKeypair(secretKey: string, encoding: "base58"): Keypair {
    if (encoding !== "base58") {
        throw new Error(`Unsupported secret key encoding: ${encoding}`);
    }
    const bytes = bs58.decode(secretKey.trim());
    if (bytes.length !== 64) {
        throw new Error("Secret key must decode to 64 bytes.");
    }
    return Keypair.fromSecretKey(bytes);
}

function keypairFromWalletInput(wallet: WalletInput): Keypair {
    const encoding = wallet.encoding ?? "base58";
    return decodeKeypair(wallet.secretKey, encoding);
}

function parseSlippage(value: number | string | undefined): bigint | undefined {
    if (value == null) return undefined;
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(Math.max(0, Math.trunc(value)));
    const trimmed = String(value).trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid slippage basis points: ${value}`);
    }
    return BigInt(Math.max(0, Math.trunc(parsed)));
}

function parseLamports(input: string | number | bigint): bigint {
    if (typeof input === "bigint") return input;
    if (typeof input === "number") {
        return BigInt(Math.round(input * Number(LAMPORTS_PER_SOL)));
    }
    const lamports = toLamports(input);
    if (!lamports) {
        throw new Error(`Invalid SOL amount: ${input}`);
    }
    return BigInt(lamports);
}

function parseTokenAmountDecimal(
    value: string | number | bigint,
    decimals: number
): bigint {
    if (typeof value === "bigint") {
        return value;
    }
    const normalized =
        typeof value === "number" ? value.toString(10) : String(value).trim();
    if (!normalized) {
        throw new Error("Token amount must be a positive number.");
    }
    if (!normalized.includes(".")) {
        if (!/^\d+$/.test(normalized)) {
            throw new Error(`Invalid token amount: ${value}`);
        }
        const raw = BigInt(normalized);
        return raw * 10n ** BigInt(decimals);
    }
    const [whole, fractional] = normalized.split(".");
    if (whole && !/^\d+$/.test(whole)) {
        throw new Error(`Invalid token amount: ${value}`);
    }
    if (fractional && !/^\d+$/.test(fractional)) {
        throw new Error(`Invalid token amount: ${value}`);
    }
    const wholeValue = whole ? BigInt(whole) : 0n;
    const frac = fractional ?? "";
    const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
    const fractionalValue = fracPadded ? BigInt(fracPadded) : 0n;
    return wholeValue * 10n ** BigInt(decimals) + fractionalValue;
}

function normalizePriorityFees(
    value?: PriorityFeeInput
): PumpFunPriorityFee | undefined {
    if (!value) return undefined;
    if (value.unitLimit != null && value.unitPrice != null) {
        return { unitLimit: value.unitLimit, unitPrice: value.unitPrice };
    }
    return undefined;
}

function priorityFeesToSerializable(fees?: PumpFunPriorityFee) {
    if (!fees) return undefined;
    return { unitLimit: fees.unitLimit, unitPrice: fees.unitPrice };
}

function lamportsToSolString(lamports: bigint): string {
    return formatSolanaTokenAmount(lamports.toString(), 9);
}

function buildExplorerUrl(signature: string | null | undefined, cluster: Cluster) {
    if (!signature) return undefined;
    const base = `https://solscan.io/tx/${signature}`;
    return cluster === "devnet" ? `${base}?cluster=devnet` : base;
}

function stringifyError(error: UntypedJson): string {
    if (!error) return "Unknown error";
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
        return JSON.stringify(error);
    } catch {
        return "Unknown error";
    }
}

function summariseTransaction(result: Awaited<ReturnType<typeof buyTokens>>) {
    return {
        success: result.success,
        signature: result.signature ?? null,
        error: result.error ? stringifyError(result.error) : null,
    };
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

async function handleCreateAndBuy(
    input: PumpFunTraderInput
): Promise<PumpFunToolResponse> {
    if (!input.creator) throw new Error("creator wallet is required for create_and_buy");
    if (!input.metadata) throw new Error("metadata is required for create_and_buy");
    if (!input.buyAmount) throw new Error("buyAmount is required for create_and_buy");

    const cluster = input.cluster ?? "mainnet-beta";
    const creator = keypairFromWalletInput(input.creator);
    const mint =
        input.mint && typeof input.mint === "object"
            ? keypairFromWalletInput(input.mint)
            : Keypair.generate();

    const slippage =
        parseSlippage(input.slippageBasisPoints) ?? BigInt(500); // Default 500 bps
    const lamports = parseLamports(input.buyAmount);
    const resolvedPriority =
        normalizePriorityFees(input.priorityFees) ?? getDefaultPriorityFees(cluster);
    const operationId = generateOperationId();

    const result = await createAndBuyToken({
        cluster,
        creator,
        mint,
        metadata: input.metadata,
        buyAmountLamports: lamports,
        slippageBasisPoints: slippage,
        priorityFees: resolvedPriority ?? undefined,
        commitment: input.commitment,
        finality: input.finality,
    });

    const signature = result.signature ?? null;
    const success = result.success;
    const errorMessage = result.error ? stringifyError(result.error) : null;
    const explorerUrl = buildExplorerUrl(signature, cluster);
    const solAmount = lamportsToSolString(lamports);
    const mintAddress = mint.publicKey.toBase58();
    const description = success
        ? `Purchased ${solAmount} SOL of ${input.metadata.symbol} liquidity on ${cluster}.`
        : errorMessage ?? "Pump.fun create_and_buy failed.";

    const artifact = createTradeArtifactEnvelope({
        command: "create_and_buy",
        cluster,
        mint: mintAddress,
        success,
        signature,
        description,
        error: errorMessage,
        slippage,
        priorityFees: resolvedPriority ?? undefined,
        explorerUrl,
    });

    const text = success
        ? `Created token ${input.metadata.symbol} (${mintAddress}) and purchased ${solAmount} SOL on ${cluster}.`
        : `Pump.fun create_and_buy failed for ${input.metadata.symbol} (${mintAddress}): ${errorMessage}`;

    return {
        text,
        data: {
            operationId,
            command: "create_and_buy",
            cluster,
            mint: mintAddress,
            success,
            signature,
            error: errorMessage,
            explorerUrl,
            slippageBasisPoints: Number(slippage),
            priorityFees: priorityFeesToSerializable(resolvedPriority ?? undefined),
        },
        artifact,
    };
}

async function handleBuy(input: PumpFunTraderInput): Promise<PumpFunToolResponse> {
    if (!input.wallet) throw new Error("wallet is required for buy");
    if (!input.mint || typeof input.mint !== "string")
        throw new Error("mint address (string) is required for buy");
    if (!input.buyAmount) throw new Error("buyAmount is required for buy");

    const cluster = input.cluster ?? "mainnet-beta";
    const wallet = keypairFromWalletInput(input.wallet);
    const slippage =
        parseSlippage(input.slippageBasisPoints) ?? BigInt(500);
    const lamports = parseLamports(input.buyAmount);
    const mint = new PublicKey(input.mint);
    const resolvedPriority =
        normalizePriorityFees(input.priorityFees) ?? getDefaultPriorityFees(cluster);
    const operationId = generateOperationId();

    const result = await buyTokens({
        cluster,
        buyer: wallet,
        mint,
        buyAmountLamports: lamports,
        slippageBasisPoints: slippage,
        priorityFees: resolvedPriority ?? undefined,
        commitment: input.commitment,
        finality: input.finality,
    });

    const summary = summariseTransaction(result);
    const explorerUrl = buildExplorerUrl(summary.signature, cluster);
    const solAmount = lamportsToSolString(lamports);
    const mintAddress = mint.toBase58();
    const text = summary.success
        ? `Purchased ${solAmount} SOL of ${mintAddress} on ${cluster}.`
        : `Pump.fun buy failed for ${mintAddress}: ${summary.error}`;

    const artifact = createTradeArtifactEnvelope({
        command: "buy",
        cluster,
        mint: mintAddress,
        success: summary.success,
        signature: summary.signature,
        description: `Buy amount: ${solAmount} SOL.`,
        error: summary.error,
        slippage,
        priorityFees: resolvedPriority ?? undefined,
        explorerUrl,
    });

    return {
        text,
        data: {
            operationId,
            command: "buy",
            cluster,
            mint: mintAddress,
            success: summary.success,
            signature: summary.signature ?? null,
            error: summary.error,
            explorerUrl,
            slippageBasisPoints: Number(slippage),
            priorityFees: priorityFeesToSerializable(resolvedPriority ?? undefined),
            amountLamports: lamports.toString(),
            amountSol: solAmount,
        },
        artifact,
    };
}

async function handleSell(input: PumpFunTraderInput): Promise<PumpFunToolResponse> {
    if (!input.wallet) throw new Error("wallet is required for sell");
    if (!input.mint || typeof input.mint !== "string")
        throw new Error("mint address (string) is required for sell");
    if (!input.tokenAmount) throw new Error("tokenAmount is required for sell");

    const cluster = input.cluster ?? "mainnet-beta";
    const wallet = keypairFromWalletInput(input.wallet);
    const slippage =
        parseSlippage(input.slippageBasisPoints) ?? BigInt(500);
    const mint = new PublicKey(input.mint);
    const decimals = input.tokenDecimals ?? 6;
    const amountRaw = parseTokenAmountDecimal(input.tokenAmount, decimals);
    const resolvedPriority =
        normalizePriorityFees(input.priorityFees) ?? getDefaultPriorityFees(cluster);
    const operationId = generateOperationId();

    const result = await sellTokens({
        cluster,
        seller: wallet,
        mint,
        sellTokenAmount: amountRaw,
        slippageBasisPoints: slippage,
        priorityFees: resolvedPriority ?? undefined,
        commitment: input.commitment,
        finality: input.finality,
    });

    const summary = summariseTransaction(result);
    const explorerUrl = buildExplorerUrl(summary.signature, cluster);
    const tokenAmountFormatted = formatSolanaTokenAmount(amountRaw.toString(), decimals);
    const mintAddress = mint.toBase58();
    const text = summary.success
        ? `Sold ${tokenAmountFormatted} tokens of ${mintAddress} on ${cluster}.`
        : `Pump.fun sell failed for ${mintAddress}: ${summary.error}`;

    const artifact = createTradeArtifactEnvelope({
        command: "sell",
        cluster,
        mint: mintAddress,
        success: summary.success,
        signature: summary.signature,
        description: `Sell amount: ${tokenAmountFormatted} tokens.`,
        error: summary.error,
        slippage,
        priorityFees: resolvedPriority ?? undefined,
        explorerUrl,
    });

    return {
        text,
        data: {
            operationId,
            command: "sell",
            cluster,
            mint: mintAddress,
            success: summary.success,
            signature: summary.signature ?? null,
            error: summary.error,
            explorerUrl,
            slippageBasisPoints: Number(slippage),
            priorityFees: priorityFeesToSerializable(resolvedPriority ?? undefined),
            tokenAmountRaw: amountRaw.toString(),
            tokenAmountFormatted,
            tokenDecimals: decimals,
        },
        artifact,
    };
}

async function handleGetBondingCurve(
    input: PumpFunTraderInput
): Promise<PumpFunToolResponse> {
    if (!input.mint || typeof input.mint !== "string")
        throw new Error("mint address (string) is required for get_bonding_curve");

    const cluster = input.cluster ?? "mainnet-beta";
    const mint = new PublicKey(input.mint);
    const curve = await getBondingCurveAccount(cluster, mint);
    const mintAddress = mint.toBase58();

    const text = curve
        ? `Retrieved bonding curve snapshot for ${mintAddress} (${cluster}).`
        : `No bonding curve data available for ${mintAddress}.`;

    const artifact = curve
        ? createPumpFunArtifact(
            {
                view: "coin_analysis",
                headline: `Bonding curve snapshot · ${mintAddress.slice(0, 8)}…`,
                overview: {
                    mint: mintAddress,
                    name: "Pump.fun Bonding Curve",
                    symbol: mintAddress.slice(0, 6).toUpperCase(),
                    description: curve.complete
                        ? "Bonding curve has been completed and token has migrated."
                        : "Bonding curve is still active for this token.",
                    metrics: [
                        {
                            label: "Virtual Token Reserves",
                            value: formatSolanaTokenAmount(curve.virtualTokenReserves.toString(), 6),
                        },
                        {
                            label: "Virtual SOL Reserves",
                            value: `${lamportsToSolString(curve.virtualSolReserves)} SOL`,
                        },
                        {
                            label: "Real Token Reserves",
                            value: formatSolanaTokenAmount(curve.realTokenReserves.toString(), 6),
                        },
                        {
                            label: "Real SOL Reserves",
                            value: `${lamportsToSolString(curve.realSolReserves)} SOL`,
                        },
                        {
                            label: "Token Total Supply",
                            value: formatSolanaTokenAmount(curve.tokenTotalSupply.toString(), 6),
                        },
                        {
                            label: "Curve Complete",
                            value: curve.complete ? "Yes" : "No",
                        },
                    ],
                    bondingCurve: {
                        virtualTokenReserves: curve.virtualTokenReserves.toString(),
                        virtualSolReserves: curve.virtualSolReserves.toString(),
                        realTokenReserves: curve.realTokenReserves.toString(),
                        realSolReserves: curve.realSolReserves.toString(),
                        tokenTotalSupply: curve.tokenTotalSupply.toString(),
                        complete: curve.complete,
                    },
                },
                relatedTokens: [],
            } satisfies PumpFunArtifactData,
            {
                metadata: {
                    title: `Bonding Curve · ${mintAddress.slice(0, 8)}…`,
                    summary: curve.complete
                        ? "Bonding curve completed."
                        : "Bonding curve still active.",
                    context: {
                        status: curve.complete ? "completed" : "in_progress",
                        command: "get_bonding_curve",
                        mint: mintAddress,
                    },
                },
                streamState: { completed: true },
            }
        )
        : undefined;

    return {
        text,
        data: {
            command: "get_bonding_curve",
            cluster,
            mint: mintAddress,
            curve: curve
                ? {
                    virtualTokenReserves: curve.virtualTokenReserves.toString(),
                    virtualSolReserves: curve.virtualSolReserves.toString(),
                    realTokenReserves: curve.realTokenReserves.toString(),
                    realSolReserves: curve.realSolReserves.toString(),
                    tokenTotalSupply: curve.tokenTotalSupply.toString(),
                    complete: curve.complete,
                }
                : null,
        },
        artifact,
    };
}

async function handleGetGlobalAccount(
    input: PumpFunTraderInput
): Promise<PumpFunToolResponse> {
    const cluster = input.cluster ?? "mainnet-beta";
    const global = await getGlobalAccount(cluster);
    const connection = await getPumpFunConnection(cluster);
    const slot = await connection.getSlot();

    return {
        text: "Fetched Pump.fun global account state.",
        data: {
            command: "get_global_account",
            cluster,
            slot,
            account: global,
        },
    };
}

export async function executeCommand(
    input: PumpFunTraderInput
): Promise<PumpFunToolResponse> {
    switch (input.command) {
        case "create_and_buy":
            return handleCreateAndBuy(input);
        case "buy":
            return handleBuy(input);
        case "sell":
            return handleSell(input);
        case "get_bonding_curve":
            return handleGetBondingCurve(input);
        case "get_global_account":
            return handleGetGlobalAccount(input);
        default:
            throw new Error(`Unsupported pumpfun command: ${input.command}`);
    }
}
