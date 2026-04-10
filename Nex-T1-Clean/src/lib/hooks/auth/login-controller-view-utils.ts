import type { Mode } from "@/components/auth/login/types";

export type AuthTranslationFn = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function resolvePostAuthTarget(redirectTo: string | null | undefined): string {
  return redirectTo?.startsWith("/auth/") ? "/" : (redirectTo ?? "/");
}

export function getLoginHeader(mode: Mode, t: AuthTranslationFn) {
  if (mode === "sign-up") {
    return {
      title: t("headers.signUpTitle"),
      subtitle: t("headers.signUpSubtitle"),
      secondaryLabel: t("headers.signUpSubtitle"),
      primaryLabel: t("headers.signUpPrimary"),
    };
  }

  return {
    title: t("headers.signInTitle"),
    subtitle: t("headers.signInSubtitle"),
    secondaryLabel: t("headers.signInSubtitle"),
    primaryLabel: t("headers.signInPrimary"),
  };
}

export function isPasskeyEnabled(
  supabaseClient: { auth?: { signInWithWebAuthn?: () => Promise<void> } } | null,
): boolean {
  const envFlag = process.env.NEXT_PUBLIC_ENABLE_PASSKEY === "true";
  const auth = supabaseClient?.auth ?? null;
  const isBrowserSupported =
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function";
  return (envFlag || Boolean(auth?.signInWithWebAuthn)) && isBrowserSupported;
}
