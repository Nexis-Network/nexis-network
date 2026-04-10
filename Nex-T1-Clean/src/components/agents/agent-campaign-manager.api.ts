import type {
  CampaignStatusResponse,
  ReceiptTimelineResponse,
} from "@/components/agents/agent-campaign-manager.types";

type ErrorShape = {
  message?: string;
  error?: string;
  details?: string;
};

async function safeParseJson(response: Response): Promise<unknown | null> {
  return response.json().catch(() => null);
}

function resolveErrorMessage(payload: unknown, status: number, fallback: string): string {
  const parsed = (payload ?? {}) as ErrorShape;
  return (
    parsed.message ??
    parsed.error ??
    parsed.details ??
    `${fallback} (${status})`
  );
}

export async function loadCampaignStatus(agentId: string): Promise<CampaignStatusResponse | null> {
  try {
    const response = await fetch(`/api/agents/${agentId}/campaign/positions`, { method: "GET" });
    const payload = (await safeParseJson(response)) as CampaignStatusResponse | null;
    if (!response.ok || !payload) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function loadCampaignReceipts(
  agentId: string,
): Promise<ReceiptTimelineResponse["receipts"]> {
  try {
    const response = await fetch(`/api/agents/${agentId}/campaign/receipts`, { method: "GET" });
    const payload = (await safeParseJson(response)) as ReceiptTimelineResponse | null;
    if (!response.ok || !payload?.ok) {
      return [];
    }
    return payload.receipts ?? [];
  } catch {
    return [];
  }
}

export async function postCampaignMutation<TPayload extends Record<string, unknown>, TResponse = Record<string, unknown>>(
  options: {
    agentId: string;
    action: "create" | "deploy" | "finalize" | "distribute" | "contribute" | "claim";
    payload: TPayload;
    fallbackError: string;
  },
): Promise<TResponse> {
  const response = await fetch(`/api/agents/${options.agentId}/campaign/${options.action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options.payload),
  });
  const payload = await safeParseJson(response);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, response.status, options.fallbackError));
  }
  return (payload ?? {}) as TResponse;
}
