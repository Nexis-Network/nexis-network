import { createTool } from "../create-tool";
import { runToolSpan } from "@/lib/observability/sentry";
import { pumpFunTraderSchema } from "./schema";
import { executeCommand } from "./execute";
import { ARTIFACT_PART_TYPE } from "./artifact";
import type { PumpFunTraderInput, PumpFunTraderOutput } from "./types";

export const pumpFunTraderTool = createTool<PumpFunTraderInput, PumpFunTraderOutput>({
    description:
        "Pump.fun research + read-only state (bonding/global). Trading commands are blocked in chat and private keys are never accepted.",
    schema: pumpFunTraderSchema,
    execute: async (rawParams: PumpFunTraderInput): Promise<PumpFunTraderOutput> => {
        const cluster = rawParams.cluster ?? "mainnet-beta";

        const tradeCommands = new Set(["create_and_buy", "buy", "sell"]);
        if (tradeCommands.has(rawParams.command)) {
            return {
                text:
                    "Pump.fun trading is not available in chat because it would require signing material. Use a connected wallet flow to execute trades. (No private keys are ever accepted in chat.)",
                command: rawParams.command,
                cluster,
                data: {
                    blocked: true,
                    reason: "unsafe_signing_material_required",
                },
            };
        }

        // Validate command-specific required fields
        switch (rawParams.command) {
            case "create_and_buy":
                if (!rawParams.creator)
                    throw new Error("creator wallet is required for create_and_buy");
                if (!rawParams.metadata)
                    throw new Error("metadata is required for create_and_buy");
                if (!rawParams.buyAmount)
                    throw new Error("buyAmount is required for create_and_buy");
                break;
            case "buy":
                if (!rawParams.wallet) throw new Error("wallet is required for buy");
                if (!rawParams.mint) throw new Error("mint is required for buy");
                if (!rawParams.buyAmount)
                    throw new Error("buyAmount is required for buy");
                break;
            case "sell":
                if (!rawParams.wallet) throw new Error("wallet is required for sell");
                if (!rawParams.mint) throw new Error("mint is required for sell");
                if (!rawParams.tokenAmount)
                    throw new Error("tokenAmount is required for sell");
                break;
            case "get_bonding_curve":
                if (!rawParams.mint)
                    throw new Error("mint is required for get_bonding_curve");
                break;
            case "get_global_account":
                // No additional requirements
                break;
        }

        const commandResult = await runToolSpan("pumpfun_trader", async (span) => {
            span.setAttribute("pumpfun.command", rawParams.command);
            span.setAttribute("pumpfun.cluster", cluster);
            return executeCommand(rawParams);
        });

        const result: PumpFunTraderOutput = {
            text: commandResult.text,
            command: rawParams.command,
            cluster,
            data: commandResult.data,
        };

        if (commandResult.artifact) {
            result.parts = [
                {
                    type: ARTIFACT_PART_TYPE,
                    data: commandResult.artifact,
                },
            ];
        }

        return result;
    },
});

export * from "./types";
export * from "./schema";
