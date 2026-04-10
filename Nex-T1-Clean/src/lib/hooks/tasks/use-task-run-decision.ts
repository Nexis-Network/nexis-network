"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type TaskRunDecisionPayload = {
  runId: string;
  decision: "approve" | "dismiss";
  note?: string;
};

type DecisionResponse = {
  ok: true;
  status: string;
};

export function useTaskRunDecision() {
  return useMutation<DecisionResponse, Error, TaskRunDecisionPayload>({
    mutationFn: async (payload) => {
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/api/nex/task-runs/${payload.runId}/decision`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ decision: payload.decision, note: payload.note }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(detail || "Unable to submit decision");
      }
      return (await response.json()) as DecisionResponse;
    },
  });
}

