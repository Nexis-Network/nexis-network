export interface MoralisTokenBalance {
  token_address: string;
  name: string;
  symbol: string;
  logo?: string;
  thumbnail?: string;
  decimals: number;
  balance: string; // raw balance as string
  possible_spam?: boolean;
  verified_contract?: boolean;
}

export interface MoralisNativeBalance {
  balance: string; // raw balance (wei)
}

export interface MoralisWalletNetWorth {
  total_networth_usd: string;
  chains: Array<{
    chain: string;
    native_balance: string;
    native_balance_formatted: string;
    native_balance_usd: string;
    token_balance_usd: string;
    networth_usd: string;
  }>;
}

export interface MoralisTransaction {
  hash: string;
  nonce: string;
  transaction_index: string;
  from_address: string;
  to_address: string;
  value: string;
  gas: string;
  gas_price: string;
  input: string;
  receipt_cumulative_gas_used: string;
  receipt_gas_used: string;
  receipt_contract_address: string | null;
  receipt_root: string | null;
  receipt_status: string;
  block_timestamp: string;
  block_number: string;
  block_hash: string;
  transfer_index?: number[];
}

export interface MoralisDefiPosition {
  id: number;
  protocol_id: string;
  protocol_name: string;
  protocol_logo?: string;
  protocol_url?: string;
  label: string;
  net_usd_value: number;
}

// Simplified DeFi Summary as per Moralis Example responses or common usage
export interface MoralisDefiSummary {
  protocols: MoralisDefiPosition[];
  total_usd_value: number;
}

export interface MoralisTokenApproval {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_logo?: string;
  spender_address: string;
  spender_label?: string; // e.g. "Uniswap V3 Router" (if enriched)
  value: string; // allowance amount
  block_number: string;
  block_timestamp: string;
}
