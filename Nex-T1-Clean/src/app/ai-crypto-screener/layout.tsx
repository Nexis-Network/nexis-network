import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import { SupabaseAuthBoundary } from "@/components/providers/supabase-auth-provider";

type LayoutProps = {
  children: ReactNode;
};

export default function ScreenerLayout({ children }: LayoutProps) {
  return (
    <AppProviders>
      <SupabaseAuthBoundary>
        <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
          {children}
        </div>
      </SupabaseAuthBoundary>
    </AppProviders>
  );
}
