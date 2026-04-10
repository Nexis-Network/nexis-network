"use client";

import type { AuthView } from "@/components/auth/types";

import { AuthViewRouter } from "@/components/auth/auth-view-router";

type AuthPageClientProps = {
  view: AuthView;
  redirectTo: string;
  inviteCode?: string;
};

export function AuthPageClient(props: AuthPageClientProps) {
  return <AuthViewRouter key={props.view} {...props} />;
}
