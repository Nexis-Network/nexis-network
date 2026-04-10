import { createTool } from "../create-tool";
import { evmWalletHitlSchema } from "./schema";
import { executeEvmWalletHitl } from "./execute";
import {
    APPROVAL_REQUIRED_COMMANDS,
    EvmWalletHitlInput,
    EvmWalletHITLOutput,
} from "./types";

export const evmWalletToolWithHITL = createTool<
    EvmWalletHitlInput,
    EvmWalletHITLOutput
>({
    description:
        "Access the Nex-T1 MCP crypto wallet server to manage EVM wallets, query balances, and perform on-chain operations. Sensitive operations require user approval unless autonomous mode is enabled.",
    schema: evmWalletHitlSchema,
    needsApproval: ({ command }) =>
        APPROVAL_REQUIRED_COMMANDS.includes(
            command as (typeof APPROVAL_REQUIRED_COMMANDS)[number],
        ),
    execute: executeEvmWalletHitl,
});
