import { logger } from '@/lib/logger';
import {
  QuoteRequestParams, QuoteResponse,
  CheckApprovalParams, CheckApprovalResponse,
  SwapResponse,
  LpCreateRequest, LpIncreaseRequest, LpDecreaseRequest, LpClaimRequest, LpResponse,
  Swap5792Request, Swap5792Response, Swap7702Request, Swap7702Response
} from './types';

function getApiUrl(): string {
  // Use beta or production depending on settings. Docs list beta as well. Defaulting to production.
  return process.env.UNISWAP_API_URL || 'https://trade-api.gateway.uniswap.org/v1';
}

function getApiKey(): string {
  const key = process.env.UNISWAP_API_KEY;
  if (!key) {
    logger.warn('UNISWAP_API_KEY is not defined in the environment.');
  }
  return key || '';
}

/**
 * Exponential backoff for 429 responses
 */
async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init);
    // Break if OK or if it's a client error other than 429
    if (response.status !== 429 && response.status < 500) {
      return response;
    }
    
    if (attempt === maxRetries) {
      throw new Error(`Uniswap API request failed after ${maxRetries} retries with status ${response.status}`);
    }

    const delay = Math.min(200 * Math.pow(2, attempt) + Math.random() * 100, 10000);
    logger.info(`Rate limited by Uniswap API, retrying in ${Math.round(delay)}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error('Unreachable');
}

/**
 * Centralized request helper
 */
async function makeRequest<T>(endpoint: string, method: string, payload?: object): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-universal-router-version': '2.0',
  };
  
  const apiKey = getApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (payload) {
    init.body = JSON.stringify(payload);
  }

  try {
    const response = await fetchWithRetry(url, init);
    const data = await response.json();
    
    // Some responses use 'requestId' in the response for tracing, we could log it
    // if (data.requestId) {
    //   logger.debug(`Uniswap request [${endpoint}] completed with requestId: ${data.requestId}`);
    // }

    if (!response.ok) {
      throw new Error(data.detail || data.message || `API error ${response.status}`);
    }

    return data as T;
  } catch (err: unknown) {
    logger.error(`Error in Uniswap request to ${endpoint}:`, err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Approvals
// ----------------------------------------------------------------------------
export async function checkApproval(params: CheckApprovalParams): Promise<CheckApprovalResponse> {
  return makeRequest<CheckApprovalResponse>('/check_approval', 'POST', params);
}

// ----------------------------------------------------------------------------
// Quoting & Swapping
// ----------------------------------------------------------------------------
export async function getQuote(params: QuoteRequestParams): Promise<QuoteResponse> {
  return makeRequest<QuoteResponse>('/quote', 'POST', params);
}

export async function createSwapExecution(quoteResponse: QuoteResponse, signature?: string): Promise<SwapResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { permitData, permitTransaction: _permitTx, ...cleanQuote } = quoteResponse as any;


  const request: Record<string, unknown> = { ...cleanQuote } as Record<string, unknown>;

  // Only include permitData if it's a valid object AND we have a signature
  if (signature && permitData && typeof permitData === 'object') {
    request.signature = signature;
    request.permitData = permitData;
  }

  return makeRequest<SwapResponse>('/swap', 'POST', request);
}

// ----------------------------------------------------------------------------
// Tokens
// ----------------------------------------------------------------------------
export async function getSwappableTokens(chainId: number) {
  // Query param example
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return makeRequest<any>(`/swappable_tokens?chainId=${chainId}`, 'GET');
}

// ----------------------------------------------------------------------------
// Liquidity Provisioning
// ----------------------------------------------------------------------------
export async function lpCreate(params: LpCreateRequest): Promise<LpResponse> {
  return makeRequest<LpResponse>('/lp/create', 'POST', params);
}

export async function lpIncrease(params: LpIncreaseRequest): Promise<LpResponse> {
  return makeRequest<LpResponse>('/lp/increase', 'POST', params);
}

export async function lpDecrease(params: LpDecreaseRequest): Promise<LpResponse> {
  return makeRequest<LpResponse>('/lp/decrease', 'POST', params);
}

export async function lpClaim(params: LpClaimRequest): Promise<LpResponse> {
  return makeRequest<LpResponse>('/lp/claim', 'POST', params);
}

export async function submitSwap5792(params: Swap5792Request): Promise<Swap5792Response> {
  return makeRequest<Swap5792Response>('/swap_5792', 'POST', params);
}

export async function submitSwap7702(params: Swap7702Request): Promise<Swap7702Response> {
  return makeRequest<Swap7702Response>('/swap_7702', 'POST', params);
}
