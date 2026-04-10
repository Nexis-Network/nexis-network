import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { AuthenticatedThemeRoot } from "@/components/providers/authenticated-theme-root";

type CreateLayoutProps = {
  children: ReactNode;
};

export default function CreateLayout({ children }: CreateLayoutProps) {
  return (
    <AppProviders>
      <AuthenticatedThemeRoot>{children}</AuthenticatedThemeRoot>
    </AppProviders>
  );
}
