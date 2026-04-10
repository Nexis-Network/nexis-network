import type {
  EvmPseudoQuoteRequest,
  ResearchPreviewRequest,
  ResearchPreviewResponse,
  RiskPreviewRequest,
  RiskReport,
  TradeQuote,
} from "@/types/multi-agent";
import { createClient } from "@/lib/supabase/client";

type ApiOptions = {
  signal?: AbortSignal;
};

type ErrorDetails = {
  error?: string;
  message?: string;
  status?: number;
  [key: string]: UntypedJson;
};

const BASE_PATH = "/api/nex/multi-agent";

export class MultiAgentApiError extends Error {
  status?: number;
  details?: UntypedJson;

  constructor(message: string, status?: number, details?: UntypedJson) {
    super(message);
    this.name = "MultiAgentApiError";
    this.status = status;
    this.details = details;
  }
}

async function postJson<TResponse>(path: string, body: UntypedJson, options?: ApiOptions): Promise<TResponse> {
  const { data: { session } } = await createClient().auth.getSession();
  const token = session?.access_token;
  
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    signal: options?.signal,
  });

  const contentType = response.headers.get("content-type");
  let payload: UntypedJson = null;

  if (contentType?.includes("application/json")) {
    payload = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => "");
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { detail: text };
      }
    } else {
      payload = {};
    }
  }

  if (!response.ok) {
    const detail = payload as ErrorDetails;
    const message =
      detail?.error ??
      detail?.message ??
      `Request to ${path} failed${response.status ? ` with status ${response.status}` : ""}`;
    throw new MultiAgentApiError(message, response.status, payload);
  }

  return payload as TResponse;
}

export function fetchResearchPreview(
  requestBody: ResearchPreviewRequest,
  options?: ApiOptions,
): Promise<ResearchPreviewResponse> {
  return postJson<ResearchPreviewResponse>(`${BASE_PATH}/research/preview`, requestBody, options);
}

export function fetchEvmPseudoQuote(
  requestBody: EvmPseudoQuoteRequest,
  options?: ApiOptions,
): Promise<TradeQuote> {
  return postJson<TradeQuote>(`${BASE_PATH}/trading/quote`, requestBody, options);
}

export function fetchRiskPreview(
  requestBody: RiskPreviewRequest,
  options?: ApiOptions,
): Promise<RiskReport> {
  return postJson<RiskReport>(`${BASE_PATH}/risk/preview`, requestBody, options);
}
