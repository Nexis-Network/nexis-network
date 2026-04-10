import { EMAIL_REGEX } from "@/components/auth/login/constants";
import type { AuthMethod, Mode, WalletAuthMethod } from "@/components/auth/login/types";
import { formatPhoneE164 } from "@/lib/auth/phone-format";

export const WALLET_METHODS = [
  "wallet-evm",
  "wallet-solana",
  "walletconnect",
] as const satisfies readonly WalletAuthMethod[];

export type BeginCredentialDecision =
  | { type: "error"; reason: "missing" | "invalid-email" | "invalid-phone" | "accept-legal" }
  | { type: "magic-link-throttled"; seconds: number }
  | {
      type: "phone-otp";
      contact: string;
      formatted: string;
      autoFormatted: boolean;
      shouldUpdateIdentifier: boolean;
    }
  | { type: "email-otp"; contact: string }
  | { type: "magic-link"; contact: string }
  | { type: "passkey" }
  | { type: "credentials" };

export type CredentialSubmitDecision =
  | { type: "error"; reason: "missing-identifier" | "email-only-flow" }
  | { type: "otp" }
  | { type: "credentials"; email: string };

export function normalizeInviteCode(inviteCode: string | null | undefined): string | null {
  const trimmed = inviteCode?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function isWalletAuthMethod(method: AuthMethod): method is WalletAuthMethod {
  return WALLET_METHODS.includes(method as WalletAuthMethod);
}

export function isOtpAuthMethod(method: AuthMethod): method is "phone" | "email-otp" {
  return method === "phone" || method === "email-otp";
}

function isEmailIdentifierMethod(
  method: AuthMethod,
): method is "email" | "magic-link" | "email-otp" {
  return method === "email" || method === "magic-link" || method === "email-otp";
}

export function normalizeIdentifierValue(authMethod: AuthMethod, identifier: string): string {
  if (isEmailIdentifierMethod(authMethod)) {
    return identifier.trim().toLowerCase();
  }

  if (authMethod === "phone") {
    const { formatted } = formatPhoneE164(identifier);
    return formatted ?? identifier.trim();
  }

  return identifier.trim();
}

export function resolveBeginCredentialDecision(params: {
  authMethod: AuthMethod;
  identifier: string;
  mode: Mode;
  hasAcceptedPolicies: boolean;
  magicLinkCountdown: number;
}): BeginCredentialDecision {
  const { authMethod, hasAcceptedPolicies, identifier, magicLinkCountdown, mode } = params;
  const normalizedIdentifier = normalizeIdentifierValue(authMethod, identifier);
  if (!normalizedIdentifier) return { type: "error", reason: "missing" };
  if (isEmailIdentifierMethod(authMethod) && !EMAIL_REGEX.test(normalizedIdentifier)) {
    return { type: "error", reason: "invalid-email" };
  }
  if (authMethod === "phone") {
    const { formatted, error, autoFormatted } = formatPhoneE164(identifier);
    if (!formatted || error) return { type: "error", reason: "invalid-phone" };
    if (mode === "sign-up" && !hasAcceptedPolicies) {
      return { type: "error", reason: "accept-legal" };
    }
    return {
      type: "phone-otp",
      contact: formatted,
      formatted,
      autoFormatted,
      shouldUpdateIdentifier: formatted !== identifier,
    };
  }
  if (authMethod === "email-otp") {
    return mode === "sign-up" && !hasAcceptedPolicies
      ? { type: "error", reason: "accept-legal" }
      : { type: "email-otp", contact: normalizedIdentifier };
  }
  if (authMethod === "magic-link") {
    if (mode === "sign-up" && !hasAcceptedPolicies) {
      return { type: "error", reason: "accept-legal" };
    }
    return magicLinkCountdown > 0
      ? { type: "magic-link-throttled", seconds: magicLinkCountdown }
      : { type: "magic-link", contact: normalizedIdentifier };
  }
  return authMethod === "passkey" ? { type: "passkey" } : { type: "credentials" };
}

export function resolveCredentialSubmitDecision(params: {
  authMethod: AuthMethod;
  normalizedIdentifier: string;
}): CredentialSubmitDecision {
  const { authMethod, normalizedIdentifier } = params;
  if (!normalizedIdentifier) return { type: "error", reason: "missing-identifier" };
  if (authMethod === "phone") return { type: "otp" };
  if (authMethod !== "email") return { type: "error", reason: "email-only-flow" };
  return { type: "credentials", email: normalizedIdentifier };
}
