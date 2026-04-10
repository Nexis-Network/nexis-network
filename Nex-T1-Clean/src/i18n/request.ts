import {
  ACTIVE_LOCALES,
  COUNTRY_COOKIE_NAME,
  COUNTRY_TO_LOCALE,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  type ActiveLocale,
  isActiveLocale,
} from "@/i18n/config";

type ResolveLocaleInput = {
  acceptLanguage?: string | null;
  cookieLocale?: string | null;
  countryCode?: string | null;
};

type HeaderReader = {
  get(name: string): string | null;
};

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

function normalizeLocale(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

function matchActiveLocale(candidate: string | null | undefined): ActiveLocale | null {
  const normalized = normalizeLocale(candidate);
  if (!normalized) return null;

  const exactMatch = ACTIVE_LOCALES.find(
    (locale) => locale.toLowerCase() === normalized.toLowerCase(),
  );
  if (exactMatch) return exactMatch;

  const language = normalized.split("-")[0]?.toLowerCase();
  if (!language) return null;

  switch (language) {
    case "en":
      return "en-US";
    case "es":
      return "es-ES";
    case "zh":
      return "zh-CN";
    case "nl":
      return "nl-NL";
    case "ko":
      return "ko-KR";
    case "ru":
      return "ru-RU";
    default:
      return null;
  }
}

function parseAcceptLanguage(header: string | null | undefined): ActiveLocale | null {
  if (!header) return null;

  const candidates = header
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const matched = matchActiveLocale(candidate);
    if (matched) return matched;
  }

  return null;
}

export function resolveRequestLocale({
  acceptLanguage,
  cookieLocale,
  countryCode,
}: ResolveLocaleInput): ActiveLocale {
  const cookieMatch = matchActiveLocale(cookieLocale);
  if (cookieMatch) return cookieMatch;

  const acceptLanguageMatch = parseAcceptLanguage(acceptLanguage);
  if (acceptLanguageMatch) return acceptLanguageMatch;

  const countryMatch = countryCode ? matchActiveLocale(COUNTRY_TO_LOCALE[countryCode.toUpperCase()] ?? null) : null;
  if (countryMatch) return countryMatch;

  return DEFAULT_LOCALE;
}

export function getRequestLocaleFromHeaderValue(value: string | null | undefined): ActiveLocale {
  return isActiveLocale(value) ? value : DEFAULT_LOCALE;
}

export function getCookieLocale(cookieValue: string | null | undefined): ActiveLocale | null {
  return isActiveLocale(cookieValue) ? cookieValue : null;
}

export function buildLocaleCookieValue(locale: string | null | undefined) {
  return isActiveLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function readLocaleCookieFromHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part.startsWith(`${LOCALE_COOKIE_NAME}=`)) continue;
    return decodeURIComponent(part.slice(LOCALE_COOKIE_NAME.length + 1));
  }

  return null;
}

const GEO_COUNTRY_HEADER_KEYS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-jurisdiction-country",
] as const;

export function getCountryCodeFromHeaders(headers: HeaderReader) {
  for (const key of GEO_COUNTRY_HEADER_KEYS) {
    const value = headers.get(key)?.trim().toUpperCase();
    if (value && value.length === 2) {
      return value;
    }
  }

  return null;
}

export function resolveLocaleFromRequestStores(
  headers: HeaderReader,
  cookies: CookieReader,
): ActiveLocale {
  return resolveRequestLocale({
    acceptLanguage: headers.get("accept-language"),
    cookieLocale: cookies.get(LOCALE_COOKIE_NAME)?.value,
    countryCode:
      cookies.get(COUNTRY_COOKIE_NAME)?.value ?? getCountryCodeFromHeaders(headers),
  });
}

export { LOCALE_HEADER_NAME };
