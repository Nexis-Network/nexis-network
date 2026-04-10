import { Suspense } from "react";

import AppChatShell from "@/components/dashboard/app-chat-shell";
import { DashboardRouteLoading } from "@/components/dashboard/dashboard-route-loading";
import { TestAccountSwitcher } from "@/components/testing/test-account-switcher";

async function DashboardPageContent({ testMode }: { testMode: boolean }) {
  return (
    <>
      {testMode ? <TestAccountSwitcher /> : null}
      <AppChatShell />
    </>
  );
}

export default function DashboardPage() {
  const testMode = process.env.NEXT_PUBLIC_TEST_MODE === "true" || process.env.E2E_TEST_MODE === "true";

  return (
    <Suspense fallback={<DashboardRouteLoading />}>
      <DashboardPageContent testMode={testMode} />
    </Suspense>
  );
}
