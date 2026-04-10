import {
    createPumpFunArtifact,
    PumpFunArtifact,
    type PumpFunArtifactData,
} from "@/modules/ai/artifacts/pumpfun";
import type { Cluster } from "./types";
import type { PumpFunPriorityFee } from "@/modules/wallets/pumpfun/service";

export const ARTIFACT_PART_TYPE = `data-artifact-${PumpFunArtifact.id}` as const;

function priorityFeesToSerializable(fees?: PumpFunPriorityFee) {
    if (!fees) return undefined;
    return { unitLimit: fees.unitLimit, unitPrice: fees.unitPrice };
}

export function createTradeArtifactEnvelope(params: {
    command: "create_and_buy" | "buy" | "sell";
    cluster: Cluster;
    mint: string;
    success: boolean;
    signature?: string | null;
    description?: string;
    error?: string | null;
    slippage?: bigint;
    priorityFees?: PumpFunPriorityFee;
    explorerUrl?: string;
}): ReturnType<typeof createPumpFunArtifact> {
    const {
        command,
        cluster,
        mint,
        success,
        signature,
        description,
        error,
        slippage,
        priorityFees,
        explorerUrl,
    } = params;

    const headline = success
        ? `Pump.fun ${command.replace(/_/g, " ")} succeeded`
        : `Pump.fun ${command.replace(/_/g, " ")} failed`;

    const summary =
        description ??
        (success ? "Pump.fun trade completed successfully." : error ?? "Pump.fun trade failed.");

    return createPumpFunArtifact(
        {
            view: "trade",
            headline,
            action: {
                command,
                success,
                signature: signature ?? undefined,
                mint,
                description: description ?? undefined,
                cluster,
                slippageBasisPoints: slippage ? Number(slippage) : undefined,
                priorityFees: priorityFeesToSerializable(priorityFees),
                error: error ?? undefined,
                explorerUrl,
            },
        } satisfies PumpFunArtifactData,
        {
            metadata: {
                title: `Pump.fun ${command.replace(/_/g, " ").toUpperCase()}`,
                summary,
                context: {
                    status: success ? "completed" : "failed",
                    command,
                    mint,
                },
            },
            streamState: { completed: true },
        }
    );
}
