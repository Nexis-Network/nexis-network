/**
 * Minimal phone number formatter/validator for E.164 SMS delivery.
 * - Strips spaces, parentheses, dashes.
 * - Adds a default US country code (+1) when a 10‑digit local number is provided.
 * - Returns a helpful error when the input cannot be converted.
 */
export const PHONE_FORMAT_HELP =
  "Use full international format starting with + and country code, e.g., +1 415 555 1234.";

export type PhoneFormatResult = {
  formatted: string | null;
  autoFormatted: boolean;
  error?: string;
};

export function formatPhoneE164(raw: string): PhoneFormatResult {
  const cleaned = raw.replace(/[\s().-]/g, "").trim();
  if (!cleaned) {
    return { formatted: null, autoFormatted: false, error: PHONE_FORMAT_HELP };
  }

  const hadPlusPrefix = cleaned.startsWith("+");
  const digits = cleaned.replace(/^\+/, "");

  if (!/^\d+$/.test(digits)) {
    return { formatted: null, autoFormatted: false, error: PHONE_FORMAT_HELP };
  }

  // If the user enters a 10‑digit local US number, default to +1
  if (digits.length === 10) {
    return { formatted: `+1${digits}`, autoFormatted: true };
  }

  // Common case: 11 digits starting with US country code
  if (digits.length === 11 && digits.startsWith("1")) {
    return { formatted: `+${digits}`, autoFormatted: !hadPlusPrefix };
  }

  // Generic E.164 length guard: 8–15 digits
  if (digits.length >= 8 && digits.length <= 15) {
    return { formatted: `+${digits}`, autoFormatted: !hadPlusPrefix };
  }

  return { formatted: null, autoFormatted: false, error: PHONE_FORMAT_HELP };
}
