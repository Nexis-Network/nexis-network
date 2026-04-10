import type { ReactNode } from "react";

import { DocsSidebarLayout } from "@/components/sidebar-01";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocsSidebarLayout>{children}</DocsSidebarLayout>;
}

