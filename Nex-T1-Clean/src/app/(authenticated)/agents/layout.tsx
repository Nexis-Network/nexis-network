import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function AgentsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell insetClassName="overflow-y-auto no-scrollbar">{children}</DashboardShell>;
}
