import { Suspense } from "react";

import { AdminAuthPanel } from "@/components/admin/admin-auth-panel";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { getAdminStatus } from "@/server/auth/admin-session";
import type { AdminStatusResponse } from "@/types/admin";

function AdminPageState({ status }: { status: AdminStatusResponse }) {
  return (
    <div className="space-y-10">
      <AdminAuthPanel />

      {status.authenticated ? (
        <AdminDashboardShell />
      ) : (
        <section className="space-y-3 rounded-lg border border-dashed border-border/70 bg-card/40 p-6">
          <h2 className="text-lg font-regular">Analytics Modules (Locked)</h2>
          <p className="text-sm text-muted-foreground">
            Verify your admin session with TOTP to unlock the enterprise
            workspace: user management, wallet telemetry, subscription tooling,
            prompt review, support triage, and traffic intelligence.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>User &amp; subscription explorer with blacklist controls</li>
            <li>Wallet holdings (EVM, Solana, Bitcoin) and TVL summaries</li>
            <li>Prompt archive filters for crypto/web3/DeFi compliance</li>
            <li>Support ticket inbox with assignment and reply workflows</li>
            <li>
              Traffic analytics including IP attribution and referral tracking
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            {status.error
              ? `Last auth error: ${status.error}`
              : "Use the admin TOTP panel above to verify your session."}{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={`/auth?view=admin&redirectTo=/admin`}
            >
              Re-authenticate
            </a>
          </p>
        </section>
      )}
    </div>
  );
}

async function AdminPageContent() {
  const status = await getAdminStatus();
  return <AdminPageState status={status} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminPageState status={{ authenticated: false }} />}>
      <AdminPageContent />
    </Suspense>
  );
}
