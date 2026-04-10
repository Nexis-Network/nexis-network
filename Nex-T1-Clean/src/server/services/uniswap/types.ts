export type QuoteType = 'EXACT_INPUT' | 'EXACT_OUTPUT';
export type RoutingPreference = 'BEST_PRICE' | 'FASTEST' | 'CLASSIC';

export interface TokenInput {
  token: string;
  amount: string;
}

export interface QuoteRequestParams {
  swapper: string;
  tokenIn: string;
  tokenOut: string;
  tokenInChainId: string;
  tokenOutChainId: string;
  amount: string;
  type: QuoteType;
  slippageTolerance?: number; // percentage 0-100
  autoSlippage?: boolean;
  protocols?: string[]; // e.g. ["V2", "V3", "V4"]
  routingPreference?: RoutingPreference;
  urgency?: 'normal' | 'fast';
}

export interface QuoteResponseQuote {
  input: TokenInput;
  output: TokenInput;
  slippage: number;

  route: unknown[];
  gasFee: string;
  gasFeeUSD: string;
  gasUseEstimate: string;
}

export interface QuoteResponse {
  routing: string;
  quote: QuoteResponseQuote;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permitData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permitTransaction?: any;
}

export interface CheckApprovalParams {
  walletAddress: string;
  token: string;
  amount: string;
  chainId: number;
}

export interface ApprovalTransaction {
  to: string;
  from: string;
  data: string;
  value: string;
  chainId: number;
}

export interface CheckApprovalResponse {
  approval: ApprovalTransaction | null;
  cancel?: ApprovalTransaction;
}

export interface SwapTransaction {
  to: string;
  from: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit: string;
}

export interface SwapResponse {
  swap: SwapTransaction;
}

// Uniswap LP Types
export interface LpCreateRequest {
  walletAddress: string;
  poolAddress: string;
  token0: string;
  token1: string;
  amount0Preferred: string;
  amount1Preferred: string;
  tickLower: number;
  tickUpper: number;
  chainId: number;
}

export interface LpIncreaseRequest {
  walletAddress: string;
  tokenId: string; // The NFT ID representing the position
  amount0Preferred: string;
  amount1Preferred: string;
  chainId: number;
}

export interface LpDecreaseRequest {
  walletAddress: string;
  tokenId: string; // The NFT ID representing the position
  liquidity: string;
  amount0Min: string;
  amount1Min: string;
  chainId: number;
}

export interface LpClaimRequest {
  walletAddress: string;
  tokenId: string;
  chainId: number;
}

export interface LpResponse {
  transaction: SwapTransaction; 
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SwapRequest = any;

export interface Swap5792Request extends Omit<SwapRequest, "signature" | "permitData"> {
  // Uses same params minus signature
}

export interface Swap7702Request extends SwapRequest {
  authorization: string | object;
}

export interface Swap5792Response {
  calls: {
    to: string;
    data: string;
    value: string;
  }[];
}

export interface Swap7702Response {
  swap: SwapTransaction;
}
