import { Suspense, type ReactNode } from "react";

import { AdminSessionProvider } from "@/components/admin/admin-session-provider";
import { getAdminStatus } from "@/server/auth/admin-session";
import type { AdminStatusResponse } from "@/types/admin";

function AdminLayoutFrame({
  children,
  status,
}: {
  children: ReactNode;
  status: AdminStatusResponse;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="mb-8 border-b border-border pb-4">
          <h1 className="text-2xl font-regular">Nex-T1 Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Secure command center for admin analytics, operations, and support.
          </p>
        </header>
        <AdminSessionProvider initialStatus={status}>
          {children}
        </AdminSessionProvider>
      </div>
    </div>
  );
}

async function AdminLayoutContent({ children }: { children: ReactNode }) {
  const status = await getAdminStatus();
  return <AdminLayoutFrame status={status}>{children}</AdminLayoutFrame>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <AdminLayoutFrame status={{ authenticated: false }}>
          {children}
        </AdminLayoutFrame>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
