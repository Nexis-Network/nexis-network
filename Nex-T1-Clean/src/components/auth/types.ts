export const AUTH_VIEWS = [
  "sign-in",
  "sign-up",
  "sign-out",
  "forgot-password",
  "reset-password",
  "magic-link",
  "email-otp",
  "recover-account",
  "two-factor",
  "accept-invitation",
] as const;

export type AuthView = (typeof AUTH_VIEWS)[number];

export const DEFAULT_AUTH_VIEW: AuthView = "sign-in";
