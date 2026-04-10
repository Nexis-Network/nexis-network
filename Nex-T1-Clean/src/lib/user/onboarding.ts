import type { ProfileAggregate } from "@/lib/user/profile";

export const APP_ONBOARDING_VERSION = 2;

export type AppOnboardingRecord = {
  completedAt?: string | null;
  dismissedAt?: string | null;
  version?: number | null;
};

type OnboardingMetadataInput = Record<string, UntypedJson> | null | undefined;

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceIsoString(value: UntypedJson): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function coerceNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractAppOnboardingRecord(source: OnboardingMetadataInput): AppOnboardingRecord {
  if (!isRecord(source)) {
    return {};
  }

  return {
    completedAt: coerceIsoString(source.completedAt),
    dismissedAt: coerceIsoString(source.dismissedAt),
    version: coerceNumber(source.version),
  };
}

export function getAppOnboardingRecordFromProfile(profile?: ProfileAggregate | null): AppOnboardingRecord {
  if (!profile || !isRecord(profile.identity?.metadata)) {
    return {};
  }

  const { metadata } = profile.identity;
  if (!isRecord(metadata)) {
    return {};
  }

  const onboarding = metadata.onboarding;
  if (!isRecord(onboarding)) {
    return {};
  }

  const appGuide = onboarding.appGuide ?? onboarding["app-guide"];
  return extractAppOnboardingRecord(appGuide as Record<string, UntypedJson> | null | undefined);
}

type ShouldShowArgs = {
  record?: AppOnboardingRecord;
  localDismissed?: boolean;
  version?: number;
};

export function shouldShowAppOnboarding({
  record,
  localDismissed = false,
  version = APP_ONBOARDING_VERSION,
}: ShouldShowArgs): boolean {
  if (localDismissed) {
    return false;
  }

  if (!record) {
    return true;
  }

  const completed = typeof record.completedAt === "string" && record.completedAt.length > 0;
  const dismissed = typeof record.dismissedAt === "string" && record.dismissedAt.length > 0;
  const recordVersion = typeof record.version === "number" && Number.isFinite(record.version) ? record.version : null;

  if (!completed && !dismissed) {
    return true;
  }

  if (recordVersion !== null && recordVersion < version) {
    return true;
  }

  return false;
}

type BuildMetadataArgs = {
  status: "completed" | "dismissed";
  timestamp?: string;
  version?: number;
};

export function buildAppOnboardingMetadataUpdate(
  existingMetadata: Record<string, UntypedJson> | null | undefined,
  { status, timestamp, version = APP_ONBOARDING_VERSION }: BuildMetadataArgs,
): Record<string, UntypedJson> {
  const metadata = isRecord(existingMetadata) ? { ...existingMetadata } : {};
  const onboarding = isRecord(metadata.onboarding) ? { ...metadata.onboarding } : {};
  const appGuideRaw = isRecord(onboarding.appGuide) ? { ...onboarding.appGuide } : {};

  const iso = timestamp ?? new Date().toISOString();

  if (status === "completed") {
    appGuideRaw.completedAt = iso;
    delete appGuideRaw.dismissedAt;
  } else {
    appGuideRaw.dismissedAt = iso;
  }

  appGuideRaw.version = version;

  onboarding.appGuide = appGuideRaw;
  metadata.onboarding = onboarding;

  return metadata;
}


