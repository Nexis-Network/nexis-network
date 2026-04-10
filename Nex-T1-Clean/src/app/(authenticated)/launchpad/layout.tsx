import { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SettingsSurfaceShell } from "@/components/settings-v2/shell/settings-surface-shell";

type LaunchpadLayoutProps = {
  children: ReactNode;
};

export default function LaunchpadLayout({ children }: LaunchpadLayoutProps) {
  return (
    <DashboardShell insetClassName="overflow-hidden">
      <SettingsSurfaceShell
        width="wide"
        className="h-full"
        canvasClassName="relative"
        stackClassName="relative"
        includeFooterSpacer={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[url('/assets/stars.svg')] bg-cover bg-center opacity-[0.14]" />
        <div className="relative">{children}</div>
      </SettingsSurfaceShell>
    </DashboardShell>
  );
}
