type RemoteOrchestratorFlagResolution = {
  enabled: boolean;
  source: string;
  reason?: string;
};

const FLAG_ENV_KEYS = [
  "NEX_ENABLE_REMOTE_ORCHESTRATOR",
  "ENABLE_REMOTE_ORCHESTRATOR",
  "NEXT_PUBLIC_ENABLE_REMOTE_ORCHESTRATOR",
] as const;

const truthyValues = new Set(["1", "true", "yes", "on"]);
const falsyValues = new Set(["0", "false", "no", "off"]);

const parseBooleanFlag = (value?: string | null): boolean | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (truthyValues.has(normalized)) {
    return true;
  }
  if (falsyValues.has(normalized)) {
    return false;
  }
  return null;
};

const resolveRemoteFlag = (): RemoteOrchestratorFlagResolution => {
  for (const key of FLAG_ENV_KEYS) {
    const parsed = parseBooleanFlag(process.env[key]);
    if (parsed === null) {
      continue;
    }
    return {
      enabled: parsed,
      source: key,
      reason: parsed ? undefined : `disabled_via_${key.toLowerCase()}`,
    };
  }

  return {
    enabled: false,
    source: "default_disabled",
    reason: "default_remote_orchestrator_disabled",
  };
};

const REMOTE_ORCHESTRATOR_FLAG = resolveRemoteFlag();

export function isRemoteOrchestratorEnabled() {
  return REMOTE_ORCHESTRATOR_FLAG.enabled;
}

export function getRemoteOrchestratorFlagSource() {
  return REMOTE_ORCHESTRATOR_FLAG.source;
}

export function getRemoteOrchestratorDisableReason() {
  return REMOTE_ORCHESTRATOR_FLAG.enabled ? null : REMOTE_ORCHESTRATOR_FLAG.reason ?? "disabled";
}
