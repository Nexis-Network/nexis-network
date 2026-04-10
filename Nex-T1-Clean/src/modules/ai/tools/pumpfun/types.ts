import { createPumpFunArtifact } from "@/modules/ai/artifacts/pumpfun";

export const PUMP_FUN_COMMANDS = [
    "create_and_buy",
    "buy",
    "sell",
    "get_bonding_curve",
    "get_global_account",
] as const;

export const CLUSTERS = ["mainnet-beta", "devnet"] as const;
export const COMMITMENTS = ["processed", "confirmed", "finalized"] as const;

export const DEFAULT_SLIPPAGE_BASIS_POINTS = 500n;

export type Command = (typeof PUMP_FUN_COMMANDS)[number];
export type Cluster = (typeof CLUSTERS)[number];

export interface WalletInput {
    secretKey: string;
    encoding?: "base58";
}

export interface MetadataInput {
    name: string;
    symbol: string;
    description?: string;
    filePath?: string;
    uri?: string;
}

export interface PriorityFeeInput {
    unitLimit?: number;
    unitPrice?: number;
}

export interface PumpFunTraderInput {
    command: Command;
    cluster?: Cluster;
    priorityFees?: PriorityFeeInput;
    slippageBasisPoints?: number | string;
    commitment?: "processed" | "confirmed" | "finalized";
    finality?: "confirmed" | "finalized";
    creator?: WalletInput;
    wallet?: WalletInput;
    mint?: WalletInput | string;
    metadata?: MetadataInput;
    buyAmount?: string | number;
    tokenAmount?: string | number;
    tokenDecimals?: number;
}

export interface PumpFunToolResponse {
    text: string;
    data: Record<string, UntypedJson>;
    artifact?: ReturnType<typeof createPumpFunArtifact>;
}

export interface PumpFunTraderOutput {
    text: string;
    command: Command;
    cluster: Cluster;
    data: Record<string, UntypedJson>;
    parts?: Array<{ type: string; data: UntypedJson }>;
}
