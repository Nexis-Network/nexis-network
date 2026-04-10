import type { JSONSchema7 } from "json-schema";
import {
    createToolSchema,
    stringProp,
    integerProp,
    enumProp,
    objectProp,
} from "../create-tool";
import { PUMP_FUN_COMMANDS, CLUSTERS, COMMITMENTS } from "./types";

const walletSchema: JSONSchema7 = objectProp(
    "Wallet reference",
    {
        walletAddress: stringProp("Public wallet address or opaque wallet reference"),
    },
    ["walletAddress"]
);

walletSchema.additionalProperties = false;

const metadataSchema: JSONSchema7 = objectProp(
    "Token metadata for creation",
    {
        name: stringProp("Token name"),
        symbol: stringProp("Token symbol (max 10 chars)"),
        description: stringProp("Token description (max 512 chars)"),
        filePath: stringProp("Local file path for token image"),
        uri: stringProp("Token metadata URI"),
    },
    ["name", "symbol"]
);

const priorityFeesSchema: JSONSchema7 = objectProp(
    "Priority fees (both required if set)",
    {
        unitLimit: integerProp("Compute unit limit", { minimum: 1 }),
        unitPrice: integerProp("Price per compute unit", { minimum: 1 }),
    }
);

// Main tool schema with all command variants
export const pumpFunTraderSchema = createToolSchema(
    {
        command: enumProp(
            "Pump.fun command to execute: create_and_buy, buy, sell, get_bonding_curve, or get_global_account.",
            PUMP_FUN_COMMANDS
        ),
        cluster: enumProp("Solana cluster", CLUSTERS, "mainnet-beta"),
        priorityFees: priorityFeesSchema,
        slippageBasisPoints: {
            oneOf: [{ type: "number" }, { type: "string" }],
            description: "Slippage tolerance in basis points (1 = 0.01%)",
        } as JSONSchema7,
        commitment: enumProp("Transaction commitment level", COMMITMENTS),
        finality: enumProp("Finality requirement", ["confirmed", "finalized"]),
        // Command-specific fields (conditionally required based on command)
        creator: walletSchema,
        wallet: walletSchema,
        mint: {
            oneOf: [walletSchema, { type: "string", minLength: 32 }],
            description: "Mint address or wallet for token operations",
        } as JSONSchema7,
        metadata: metadataSchema,
        buyAmount: {
            oneOf: [{ type: "string" }, { type: "number" }],
            description: "Amount of SOL to spend when buying",
        } as JSONSchema7,
        tokenAmount: {
            oneOf: [{ type: "string" }, { type: "number" }],
            description: "Token amount to sell (accepts decimal strings)",
        } as JSONSchema7,
        tokenDecimals: integerProp("Token decimals (0-12)", {
            minimum: 0,
            maximum: 12,
            default: 6,
        }),
    },
    ["command"]
);

// JSON Schema export expected by tests/tooling
export const pumpFunTraderInputSchema = pumpFunTraderSchema;
