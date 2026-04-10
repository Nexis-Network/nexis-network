import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";
import { PortfolioWalletsLoader } from "@/app/(authenticated)/portfolio/_components/portfolio-wallets-loader";
import { PortfolioSkeleton } from "@/app/(authenticated)/portfolio/_components/portfolio-skeleton";
import { getRequestI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getRequestI18n();

  return {
    title: t("app.portfolioTitle"),
    description: t("app.portfolioDescription"),
  };
}

async function PortfolioPageContent() {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge);

  if (!context?.userId) {
    redirect("/auth?view=sign-in&next=/portfolio");
  }

  return <PortfolioWalletsLoader userId={context.userId} />;
}

export default function PortfolioPage() {
  return (
    <DashboardShell insetClassName="overflow-hidden">
      <SettingsSurfaceShell
        width="wide"
        className="h-full"
        includeFooterSpacer={false}
      >
        <Suspense fallback={<PortfolioSkeleton />}>
          <PortfolioPageContent />
        </Suspense>
      </SettingsSurfaceShell>
    </DashboardShell>
  );
}
