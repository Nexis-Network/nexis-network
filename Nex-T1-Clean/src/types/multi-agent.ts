export type ResearchPreviewRequest = {
  subgraph?: string | null;
  gql?: string | null;
  variables?: Record<string, UntypedJson> | null;
  dune_query_id?: number | null;
  dune_params?: Record<string, UntypedJson> | null;
  defi_calls?: Record<string, UntypedJson>[] | null;
  sentiment_assets?: string[] | null;
  include_trending_words?: boolean | null;
  trending_days?: number | null;
  trending_top_n?: number | null;
  tvl_chain?: string | null;
  price_symbol?: string | null;
  price_vs_currency?: string | null;
  pools_chain?: string | null;
  pools_limit?: number | null;
  historical_tvl_chain?: string | null;
  historical_tvl_days?: number | null;
  [key: string]: UntypedJson;
};

export type ResearchPreviewResponse = {
  graph_data?: Record<string, UntypedJson> | null;
  dune_rows?: UntypedJson[] | null;
  dune_state?: string | null;
  defi_results?: UntypedJson[] | null;
  sentiment_results?: Record<string, UntypedJson> | null;
  summary: string;
};

export type EvmTradeInput = {
  action?: "swap";
  chain_id: number;
  token_in_address: string;
  token_out_address: string;
  amount_in: string;
  amount_in_currency?: "wei" | "ether" | "token_units";
  slippage_bps?: number;
  wallet_ref?: string | null;
  simulate_only?: boolean;
  idempotency_key?: string | null;
};

export type SolanaTradeInput = {
  action?: "swap";
  mint_in: string;
  mint_out: string;
  amount_in: string;
  slippage_bps?: number;
  wallet_ref?: string | null;
  simulate_only?: boolean;
  idempotency_key?: string | null;
};

export type EvmPseudoQuoteRequest = {
  input: EvmTradeInput;
};

export type TradeQuote = {
  route?: string[];
  expected_out: string;
  price_impact_bps?: number | null;
  slippage_bps: number;
  fees?: Record<string, UntypedJson>;
  gas_estimate?: string | null;
  venue: string;
  quote_id: string;
  expires_at: string;
};

export type RiskCheckInput = {
  chain: "evm" | "solana";
  addresses: string[];
  checks: ("rug" | "whale_flow" | "peg_stability" | "gas_spike" | "price_sanity")[];
  thresholds?: Record<string, UntypedJson>;
};

export type RiskPreviewRequest = {
  quote: TradeQuote;
  input: RiskCheckInput;
  thresholds?: Record<string, UntypedJson> | null;
  evm_input?: EvmTradeInput | null;
  sol_input?: SolanaTradeInput | null;
};

export type RiskReport = {
  level: "low" | "medium" | "high" | "unknown";
  aggregate_score?: number | null;
  checks?: Record<string, UntypedJson>[];
  flags?: string[];
};
