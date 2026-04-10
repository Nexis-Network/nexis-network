"use client";

import dynamic from "next/dynamic";
import type { AuthView } from "./types";

import { LoginWithWallet } from "@/components/auth/login-with-wallet";
import { useTranslations } from "@/components/providers/locale-provider";

function TwoFactorLoadingFallback() {
  const t = useTranslations("auth");

  return (
    <div className="rounded-3xl border border-border/60 bg-background/80 p-8 text-center text-sm text-muted-foreground">
      {t("loading.verification")}
    </div>
  );
}

const TwoFactorVerification = dynamic(
  () => import("@/components/auth/two-factor").then((mod) => mod.TwoFactorVerification),
  {
    loading: () => <TwoFactorLoadingFallback />,
  },
);

type AuthViewRouterProps = {
  view: AuthView;
  redirectTo: string;
  inviteCode?: string;
};

export function AuthViewRouter({ view, redirectTo, inviteCode }: AuthViewRouterProps) {
  if (view === "two-factor") {
    return <TwoFactorVerification key="auth-view-two-factor" redirectTo={redirectTo} />;
  }

  return (
    <LoginWithWallet
      key={`auth-view-${view === "sign-up" ? "sign-up" : "sign-in"}`}
      redirectTo={redirectTo}
      initialMode={view === "sign-up" ? "sign-up" : "sign-in"}
      inviteCode={inviteCode}
    />
  );
}
