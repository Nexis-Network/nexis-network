import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function ScreenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell insetClassName="overflow-y-auto">{children}</DashboardShell>
  );
}
