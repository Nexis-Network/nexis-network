import { logAnalyticsBreadcrumb } from "@/modules/analytics/server";


import { logger } from '@/lib/logger';
type LifecyclePhase = "connecting" | "completed" | "failed" | "disabled" | "legacy_format_detected";

type OrchestratorLifecyclePayload = {
  phase: LifecyclePhase;
  route?: string | null;
  executor?: string | null;
  reason?: string | null;
  submissionId?: string | null;
};

export function recordOrchestratorLifecycle(payload: OrchestratorLifecyclePayload) {
  const normalized = {
    phase: payload.phase,
    route: payload.route ?? null,
    executor: payload.executor ?? "local",
    reason: payload.reason ?? null,
    submissionId: payload.submissionId ?? null,
  };

  try {
    logAnalyticsBreadcrumb("orchestrator_lifecycle", normalized);
  } catch (error) {
    logger.warn("[orchestrator] telemetry emit failed", error);
  }
}
