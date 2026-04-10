type MagicLinkStatusOptions = {
  email?: string | null;
  requested: boolean;
  countdown: number;
};

export type MagicLinkStatusCopy = {
  requested: boolean;
  email: string;
  headline: string;
  detail: string;
  ctaLabel: string;
  ctaDisabled: boolean;
};

const DEFAULT_EMAIL_FALLBACK = "your email";

export function getMagicLinkStatusCopy(options: MagicLinkStatusOptions): MagicLinkStatusCopy {
  const normalizedEmail = options.email?.trim();
  const emailTarget = normalizedEmail && normalizedEmail.length > 0 ? normalizedEmail : DEFAULT_EMAIL_FALLBACK;
  const countdown = Math.max(0, options.countdown);
  const requested = Boolean(options.requested);

  if (!requested) {
    return {
      requested,
      email: emailTarget,
      headline: "Receive a secure sign-in link in your inbox—no password required.",
      detail: "Links expire after a few minutes to keep your account safe.",
      ctaLabel: "Send link",
      ctaDisabled: false,
    };
  }

  if (countdown > 0) {
    return {
      requested,
      email: emailTarget,
      headline: `Magic link sent to ${emailTarget}.`,
      detail: `You can resend in ${countdown}s.`,
      ctaLabel: `Wait ${countdown}s`,
      ctaDisabled: true,
    };
  }

  return {
    requested,
    email: emailTarget,
    headline: `Magic link sent to ${emailTarget}.`,
    detail: "Link not received? Send it again.",
    ctaLabel: "Resend link",
    ctaDisabled: false,
  };
}

export function buildMagicLinkConfirmUrl(origin: string, redirectTo?: string | null): string {
  const base = origin?.trim().length ? origin : "http://localhost:3000";
  const target = new URL("/auth/confirm", base);
  if (redirectTo && redirectTo.trim().length > 0) {
    target.searchParams.set("redirectTo", redirectTo.trim());
  }
  return target.toString();
}
