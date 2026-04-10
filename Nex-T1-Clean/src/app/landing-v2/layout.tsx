import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import { SupabaseAuthBoundary } from "@/components/providers/supabase-auth-provider";

type LandingV2LayoutProps = {
  children: ReactNode;
};

export default function LandingV2Layout({ children }: LandingV2LayoutProps) {
  return (
    <AppProviders>
      <SupabaseAuthBoundary>
        <div className="flex min-h-dvh flex-col bg-background text-foreground font-sans antialiased">
          {children}
        </div>
      </SupabaseAuthBoundary>
    </AppProviders>
  );
}
