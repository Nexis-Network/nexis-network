import type { ReactNode } from "react";

import { SettingsAppShell } from "@/components/settings-v2/shell/settings-app-shell";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsAppShell>{children}</SettingsAppShell>;
}
