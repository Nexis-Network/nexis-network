"use client";

import { useAdminSession } from "@/components/admin/admin-session-provider";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminUsersModule } from "@/components/admin/admin-users-module";

export function AdminDashboardShell() {
  const { status } = useAdminSession();

  if (!status?.authenticated) {
    return null;
  }

  return (
    <div className="space-y-8">
      <AdminOverview />
      <AdminUsersModule />
    </div>
  );
}
