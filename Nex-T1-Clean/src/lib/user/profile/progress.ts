import type { ProfileAggregate } from "@/lib/user/profile";

export type ProfileCompletionCheck = {
  id: string;
  label: string;
  satisfied: boolean;
};

export type ProfileCompletionState = {
  percent: number;
  completed: number;
  total: number;
  checks: ProfileCompletionCheck[];
};

export function calculateProfileCompletion(profile?: ProfileAggregate | null): ProfileCompletionState {
  const identity = profile?.identity;
  const security = profile?.security;

  const checks: ProfileCompletionCheck[] = [
    { id: "display-name", label: "Add display name", satisfied: Boolean(identity?.displayName?.trim()) },
    {
      id: "generated-avatar",
      label: "Generated avatar ready",
      satisfied: true,
    },
    { id: "username", label: "Claim a username", satisfied: Boolean(identity?.username?.trim()) },
    { id: "bio", label: "Write a short bio", satisfied: Boolean(identity?.bio?.trim()) },
    { id: "locale", label: "Set locale & time zone", satisfied: Boolean(identity?.locale && identity?.timeZone) },
    { id: "email-verified", label: "Verify email address", satisfied: Boolean(identity?.emailVerified) },
    { id: "mfa", label: "Enable MFA", satisfied: Boolean(security?.mfaEnabled) },
  ];

  const total = checks.length;
  const completed = checks.filter((check) => check.satisfied).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    percent,
    completed,
    total,
    checks,
  };
}
