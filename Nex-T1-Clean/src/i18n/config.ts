export const LOCALE_COOKIE_NAME = "nex-locale";
export const COUNTRY_COOKIE_NAME = "nex-country";
export const LOCALE_HEADER_NAME = "x-nex-locale";

export const DEFAULT_LOCALE = "en-US" as const;

export const ACTIVE_LOCALE_OPTIONS = [
  { value: "en-US", label: "English", nativeLabel: "English" },
  { value: "es-ES", label: "Spanish", nativeLabel: "Español" },
  { value: "zh-CN", label: "Chinese (Mandarin)", nativeLabel: "简体中文" },
  { value: "nl-NL", label: "Dutch", nativeLabel: "Nederlands" },
  { value: "ko-KR", label: "Korean", nativeLabel: "한국어" },
  { value: "ru-RU", label: "Russian", nativeLabel: "Русский" },
] as const;

export const PLANNED_LOCALE_OPTIONS = [
  { value: "pt-BR", label: "Portuguese (BR)", nativeLabel: "Português (Brasil)" },
  { value: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "vi-VN", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { value: "ja-JP", label: "Japanese", nativeLabel: "日本語" },
  { value: "tr-TR", label: "Turkish", nativeLabel: "Türkçe" },
] as const;

export const ALL_LOCALE_OPTIONS = [...ACTIVE_LOCALE_OPTIONS, ...PLANNED_LOCALE_OPTIONS] as const;

export type ActiveLocale = (typeof ACTIVE_LOCALE_OPTIONS)[number]["value"];
export type LocaleOption = (typeof ALL_LOCALE_OPTIONS)[number];

export const ACTIVE_LOCALES = ACTIVE_LOCALE_OPTIONS.map((option) => option.value);
export const ALL_LOCALES = ALL_LOCALE_OPTIONS.map((option) => option.value);

export const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "ES", label: "Spain" },
  { value: "CN", label: "China" },
  { value: "NL", label: "Netherlands" },
  { value: "KR", label: "South Korea" },
  { value: "RU", label: "Russia" },
  { value: "BR", label: "Brazil" },
  { value: "IN", label: "India" },
  { value: "VN", label: "Vietnam" },
  { value: "JP", label: "Japan" },
  { value: "TR", label: "Turkey" },
] as const;

export const COUNTRY_TO_LOCALE: Record<string, ActiveLocale | string> = {
  US: "en-US",
  ES: "es-ES",
  MX: "es-ES",
  AR: "es-ES",
  CL: "es-ES",
  CO: "es-ES",
  PE: "es-ES",
  CN: "zh-CN",
  SG: "zh-CN",
  NL: "nl-NL",
  BE: "nl-NL",
  KR: "ko-KR",
  RU: "ru-RU",
  BR: "pt-BR",
  IN: "hi-IN",
  VN: "vi-VN",
  JP: "ja-JP",
  TR: "tr-TR",
};

export const LOCALE_TO_DEFAULT_COUNTRY: Record<string, string> = {
  "en-US": "US",
  "es-ES": "ES",
  "zh-CN": "CN",
  "nl-NL": "NL",
  "ko-KR": "KR",
  "ru-RU": "RU",
  "pt-BR": "BR",
  "hi-IN": "IN",
  "vi-VN": "VN",
  "ja-JP": "JP",
  "tr-TR": "TR",
};

export function isActiveLocale(value: string | null | undefined): value is ActiveLocale {
  return ACTIVE_LOCALES.includes(value as ActiveLocale);
}

export function getActiveLocaleOption(value: string | null | undefined) {
  return ACTIVE_LOCALE_OPTIONS.find((option) => option.value === value) ?? ACTIVE_LOCALE_OPTIONS[0];
}

