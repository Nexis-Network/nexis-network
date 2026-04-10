// Domain: wallets (CDP V2)
// Responsibility: Shared types for Agent Spend UI.
// Note: safe_address fields reflect the legacy DB column name; display as "Wallet".

export type PolicyRow = {
  chain_id: number;
  safe_address: string | null;
  enabled: boolean;
  reset_interval_seconds: number;
  policy: Record<string, UntypedJson>;
  updated_at?: string | null;
};

export type EventRow = {
  id: string;
  chain_id: number | null;
  safe_address: string | null;
  event_type: string;
  status: string;
  title: string;
  body: string | null;
  created_at: string;
};

export type SafeTxRequestListItem = {
  id: string;
  chain_id: number;
  safe_address: string;
  to_address: string;
  value_wei: string;
  data: string;
  operation: number;
  nonce: string | null;
  safe_tx_hash: string | null;
  execution_tx_hash?: string | null;
  created_by: "user" | "agent";
  status: "proposed" | "approved" | "rejected" | "executed" | "failed" | "expired";
  requires_mfa: boolean;
  created_at: string;
  updated_at: string;
  last_error: string | null;
};
