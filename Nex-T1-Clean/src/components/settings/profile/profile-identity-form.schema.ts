import * as z from "zod";

import {
  ENS_SUBNAME_MAX_LENGTH,
  ENS_SUBNAME_MIN_LENGTH,
  isEnsSubnameLabel,
} from "@/lib/ens/subnames";
import type { Identity } from "@/lib/user/profile";
import {
  ACTIVE_LOCALE_OPTIONS,
  DEFAULT_LOCALE,
  LOCALE_TO_DEFAULT_COUNTRY,
} from "@/i18n/config";

export const SYSTEM_LOCALE_SENTINEL = "__system__";

export const profileIdentityFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(80, "Display name must be 80 characters or less"),
  username: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || isEnsSubnameLabel(value),
      {
        message:
          `Username must be ${ENS_SUBNAME_MIN_LENGTH}-${ENS_SUBNAME_MAX_LENGTH} lowercase letters, numbers, or hyphens.`,
      },
    ),
  locale: z.string().trim().max(16).optional(),
  countryCode: z.string().trim().max(2).optional(),
  timeZone: z.string().trim().min(2, "Time zone is required"),
  bio: z
    .string()
    .trim()
    .max(280, "Bio must be 280 characters or less")
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
});

export type ProfileIdentityFormValues = z.infer<
  typeof profileIdentityFormSchema
>;

export function createProfileIdentityFormValues(
  identity?: Identity,
): ProfileIdentityFormValues {
  return {
    displayName: identity?.displayName ?? "",
    username: identity?.username ?? "",
    locale: identity?.locale ?? undefined,
    countryCode: resolveProfileCountryCode(identity),
    timeZone: identity?.timeZone ?? guessTimeZone(),
    bio: (identity?.bio ?? "") || undefined,
  };
}

export function resolveProfileCountryCode(
  identity?: Identity,
): string | undefined {
  if (typeof identity?.metadata?.preferredCountryCode === "string") {
    return String(identity.metadata.preferredCountryCode);
  }

  return LOCALE_TO_DEFAULT_COUNTRY[identity?.locale ?? DEFAULT_LOCALE];
}

export function resolveProfileTimeZones(): string[] {
  if (typeof Intl !== "undefined" && hasSupportedValuesOf(Intl)) {
    return Intl.supportedValuesOf("timeZone");
  }

  return [
    "UTC",
    "America/Los_Angeles",
    "America/New_York",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Singapore",
    "Asia/Tokyo",
  ];
}

export function resolveProfileLocales(current?: string | null) {
  const options: Array<{
    value: string;
    label: string;
    nativeLabel: string;
  }> = ACTIVE_LOCALE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    nativeLabel: option.nativeLabel,
  }));

  if (current && !options.some((option) => option.value === current)) {
    options.unshift({ value: current, label: current, nativeLabel: current });
  }

  return options;
}

export function mergeProfileMetadata(
  metadata: Record<string, UntypedJson> | null,
  values: ProfileIdentityFormValues,
) {
  const base = metadata ? { ...metadata } : {};
  const profile = {
    ...(typeof base.profile === "object" && base.profile !== null
      ? (base.profile as Record<string, UntypedJson>)
      : {}),
    timeZone: values.timeZone,
    locale: values.locale ?? undefined,
    preferredCountryCode: values.countryCode ?? undefined,
    bio: values.bio ?? undefined,
  };

  return {
    ...base,
    profile,
    preferredCountryCode: values.countryCode ?? undefined,
    localeUpdatedAt: new Date().toISOString(),
  };
}

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf: (key: string) => string[];
};

function hasSupportedValuesOf(
  intl: typeof Intl,
): intl is IntlWithSupportedValues {
  return (
    typeof (intl as IntlWithSupportedValues).supportedValuesOf === "function"
  );
}

function guessTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
