import { ReactNode, Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AppProviders } from "@/components/providers/app-providers";
import { AuthenticatedProviders } from "@/components/providers/authenticated-providers";
import { StairsPageTransitionShell } from "@/components/visuals/transitions/stairs-page-transition-shell";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { isNonProductionTestMode } from "@/server/auth/test-mode";

export type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export function AuthenticatedAppShell({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <AppProviders>
      <AuthenticatedProviders>
        <StairsPageTransitionShell contentClassName="topbar-content">
          {children}
        </StairsPageTransitionShell>
      </AuthenticatedProviders>
    </AppProviders>
  );
}

export async function AuthenticatedLayoutContent({
  children,
}: AuthenticatedLayoutProps) {
  await connection();
  const jar = await cookies();
  const testMode = isNonProductionTestMode({ cookies: jar });

  if (testMode) {
    return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
  }

  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, {
    refreshSession: false,
  });

  if (!context?.userId) {
    redirect("/auth?view=sign-in");
  }

  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}

export function AuthenticatedLayoutSuspense({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <Suspense fallback={null}>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </Suspense>
  );
}
