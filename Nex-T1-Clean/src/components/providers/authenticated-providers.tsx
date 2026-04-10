"use client";

import { ReactNode } from "react";
import { CreditsProvider } from "@/components/providers/credits-provider";
import { ActiveAccountProvider } from "@/components/providers/active-account-provider";
import { OptionalBasejumpProvider } from "@/components/providers/optional-basejump-provider";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { NonCustodialWalletGuard } from "@/components/auth/non-custodial-guard";
import { AuthenticatedShellDataProvider } from "@/components/providers/authenticated-shell-data-provider";
import { AuthenticatedThemeRoot } from "@/components/providers/authenticated-theme-root";

type AuthenticatedProvidersProps = {
  children: ReactNode;
};

export function AuthenticatedProviders({
  children,
}: AuthenticatedProvidersProps) {
  return (
    <AuthenticatedShellDataProvider>
      <AuthenticatedThemeRoot>
        <CreditsProvider>
          <OptionalBasejumpProvider>
            <ActiveAccountProvider>
              <OnboardingGuard>
                <NonCustodialWalletGuard>
                  {children}
                </NonCustodialWalletGuard>
              </OnboardingGuard>
            </ActiveAccountProvider>
          </OptionalBasejumpProvider>
        </CreditsProvider>
      </AuthenticatedThemeRoot>
    </AuthenticatedShellDataProvider>
  );
}
