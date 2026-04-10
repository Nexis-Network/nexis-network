import type { ProfileAggregate } from "@/lib/user/profile";

export const APP_RELEASE_POPUP_VERSION = "2026-03-05-nex-copilot";
export const APP_RELEASE_POPUP_SECOND_IMPRESSION_DELAY_MS = 24 * 60 * 60 * 1000;

export type AppReleasePopupRecord = {
  version?: string | null;
  firstShownAt?: string | null;
  secondShownAt?: string | null;
};

type PopupMetadataInput = Record<string, UntypedJson> | null | undefined;

type EligibleAppReleasePopupArgs = {
  record?: AppReleasePopupRecord;
  version?: string;
  now?: Date | number | string;
};

type BuildMetadataArgs = {
  impression: 1 | 2;
  timestamp?: string;
  version?: string;
};

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceString(value: UntypedJson): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toMillis(value: Date | number | string | null | undefined): number | null {
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
  }

  return null;
}

export function extractAppReleasePopupRecord(source: PopupMetadataInput): AppReleasePopupRecord {
  if (!isRecord(source)) {
    return {};
  }

  return {
    version: coerceString(source.version),
    firstShownAt: coerceString(source.firstShownAt),
    secondShownAt: coerceString(source.secondShownAt),
  };
}

export function getAppReleasePopupRecordFromProfile(
  profile?: ProfileAggregate | null,
): AppReleasePopupRecord {
  if (!profile || !isRecord(profile.identity?.metadata)) {
    return {};
  }

  const announcements = profile.identity.metadata.announcements;
  if (!isRecord(announcements)) {
    return {};
  }

  return extractAppReleasePopupRecord(
    announcements.appReleasePopup as Record<string, UntypedJson> | null | undefined,
  );
}

export function mergeAppReleasePopupRecords(
  primary?: AppReleasePopupRecord | null,
  secondary?: AppReleasePopupRecord | null,
  version = APP_RELEASE_POPUP_VERSION,
): AppReleasePopupRecord {
  const primaryMatches = primary?.version === version;
  const secondaryMatches = secondary?.version === version;

  if (primaryMatches && secondaryMatches) {
    return {
      version,
      firstShownAt: primary?.firstShownAt ?? secondary?.firstShownAt ?? null,
      secondShownAt: primary?.secondShownAt ?? secondary?.secondShownAt ?? null,
    };
  }

  if (primaryMatches) {
    return primary ?? {};
  }

  if (secondaryMatches) {
    return secondary ?? {};
  }

  return primary ?? secondary ?? {};
}

export function getEligibleAppReleasePopupImpression({
  record,
  version = APP_RELEASE_POPUP_VERSION,
  now = Date.now(),
}: EligibleAppReleasePopupArgs): 1 | 2 | null {
  const currentTime = toMillis(now);
  if (currentTime === null) {
    return null;
  }

  const activeRecord = record ?? {};
  if (activeRecord.version !== version) {
    return 1;
  }

  const firstShownAt = toMillis(activeRecord.firstShownAt);
  if (firstShownAt === null) {
    return 1;
  }

  if (toMillis(activeRecord.secondShownAt) !== null) {
    return null;
  }

  if (currentTime - firstShownAt >= APP_RELEASE_POPUP_SECOND_IMPRESSION_DELAY_MS) {
    return 2;
  }

  return null;
}

export function shouldShowAppReleasePopup(
  args: EligibleAppReleasePopupArgs,
): boolean {
  return getEligibleAppReleasePopupImpression(args) !== null;
}

export function recordAppReleasePopupImpression(
  currentRecord: AppReleasePopupRecord | null | undefined,
  {
    impression,
    timestamp,
    version = APP_RELEASE_POPUP_VERSION,
  }: BuildMetadataArgs,
): AppReleasePopupRecord {
  const iso = timestamp ?? new Date().toISOString();
  const currentVersionRecord =
    currentRecord?.version === version ? currentRecord : undefined;

  if (impression === 1) {
    return {
      version,
      firstShownAt: iso,
      secondShownAt: null,
    };
  }

  return {
    version,
    firstShownAt: currentVersionRecord?.firstShownAt ?? iso,
    secondShownAt: iso,
  };
}

export function buildAppReleasePopupMetadataUpdate(
  existingMetadata: Record<string, UntypedJson> | null | undefined,
  args: BuildMetadataArgs,
): Record<string, UntypedJson> {
  const metadata = isRecord(existingMetadata) ? { ...existingMetadata } : {};
  const announcements = isRecord(metadata.announcements)
    ? { ...metadata.announcements }
    : {};

  const existingRecord = extractAppReleasePopupRecord(
    announcements.appReleasePopup as Record<string, UntypedJson> | null | undefined,
  );

  const nextRecord = recordAppReleasePopupImpression(existingRecord, args);

  announcements.appReleasePopup = {
    version: nextRecord.version ?? args.version ?? APP_RELEASE_POPUP_VERSION,
    firstShownAt: nextRecord.firstShownAt ?? null,
    secondShownAt: nextRecord.secondShownAt ?? null,
  };

  metadata.announcements = announcements;

  return metadata;
}
