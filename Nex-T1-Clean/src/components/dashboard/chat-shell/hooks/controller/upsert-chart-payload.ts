import type { AssistantPayload } from "@/components/dashboard/chat-types";

export const upsertChartPayload = (
  payloads: AssistantPayload[] | undefined,
  next: Extract<AssistantPayload, { type: "pyth-chart" }>,
): AssistantPayload[] => {
  if (!payloads || payloads.length === 0) {
    return [next];
  }

  let replaced = false;
  const updated = payloads.map((payload) => {
    if (payload.type === "pyth-chart" && payload.ticker === next.ticker) {
      replaced = true;
      return {
        ...payload,
        ...next,
        news: next.news ?? payload.news,
        snapshot: next.snapshot ?? payload.snapshot,
        error: next.error ?? payload.error,
      };
    }
    return payload;
  });

  if (!replaced) {
    updated.push(next);
  }

  return updated;
};
