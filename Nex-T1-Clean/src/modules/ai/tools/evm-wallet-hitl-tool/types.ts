import type { EvmWalletToolName } from "@/server/services/mcp/evm-wallet-client";
import type { ApprovalPayload } from "@/lib/approvals/state-machine";

export const APPROVAL_REQUIRED_COMMANDS = [
    "wallet_send_transaction",
    "wallet_bridge_assets",
    "wallet_swap_tokens",
    "wallet_sign_transaction",
    "wallet_sign_message",
    "wallet_sign_typed_data",
    // Sensitive key material operations (blocked or approval-gated)
    "wallet_encrypt",
    "wallet_get_private_key",
    "wallet_get_mnemonic",
    "wallet_from_private_key",
    "wallet_from_mnemonic",
    "wallet_from_encrypted_json",
] as const;

export const WALLET_PERSIST_COMMANDS: ReadonlySet<EvmWalletToolName> = new Set([
    "wallet_create_random",
]);

export const EVM_TOOL_NAMES = [
    "wallet_provider_set",
    "wallet_create_random",
    "wallet_get_address",
    "wallet_get_public_key",
    "wallet_get_balance",
    "wallet_get_chain_id",
    "wallet_get_gas_price",
    "wallet_get_transaction_count",
    "wallet_call",
    "wallet_send_transaction",
    "wallet_sign_transaction",
    "wallet_populate_transaction",
    "wallet_sign_message",
    "wallet_sign_typed_data",
    "wallet_verify_message",
    "wallet_verify_typed_data",
    "wallet_bridge_assets",
    "wallet_swap_tokens",
    "provider_get_block",
    "provider_get_transaction",
    "provider_get_transaction_receipt",
    "provider_get_code",
    "provider_get_storage_at",
    "provider_estimate_gas",
    "provider_get_logs",
    "provider_get_ens_resolver",
    "provider_lookup_address",
    "provider_resolve_name",
    "network_get_network",
    "network_get_block_number",
    "network_get_fee_data",
] as const satisfies readonly EvmWalletToolName[];

export interface EvmWalletHitlInput {
    command: EvmWalletToolName;
    args?: Array<{ key: string; value: UntypedJson }>;
    providerURL?: string;
    userId?: string;
}

export interface EvmWalletHITLOutput {
    command: EvmWalletToolName;
    text: string;
    response?: {
        content: { type: string;[key: string]: UntypedJson }[];
        isError?: boolean;
        toolResult?: UntypedJson;
    };
    toolResult?: UntypedJson;
    approved: boolean;
    autoApproved: boolean;
    approvalRequired?: boolean;
    approvalState?: "awaiting_approval" | "executed_via_auto_approve" | "approved" | "rejected" | "not_required";
    approvalId?: string;
    expiresAt?: string;
    preview?: ApprovalPayload["preview"];
    rejected?: boolean;
    rejectionReason?: string;
}
