"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { ChunkReloadListener } from "@/components/providers/chunk-reload-listener";
import { createAppQueryClient } from "@/components/providers/query-client";
import { SupabaseAuthBoundary } from "@/components/providers/supabase-auth-provider";
import { Toaster } from "@/components/ui/sonner";

type AuthRouteProvidersProps = {
  children: ReactNode;
};

function AuthDarkThemeScope({ children }: AuthRouteProvidersProps): ReactElement {
  useEffect(() => {
    const { dataset } = document.documentElement;
    const previousTheme = dataset.authTheme;

    dataset.authTheme = "dark";

    return () => {
      if (previousTheme === undefined) {
        delete dataset.authTheme;
        return;
      }

      dataset.authTheme = previousTheme;
    };
  }, []);

  return (
    <div className="auth-theme-root min-h-screen w-full" data-auth-theme="dark">
      {children}
    </div>
  );
}

export function AuthRouteProviders({
  children,
}: AuthRouteProvidersProps): ReactElement {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ChunkReloadListener />
      <AuthDarkThemeScope>
        <SupabaseAuthBoundary>{children}</SupabaseAuthBoundary>
        <Toaster position="top-right" richColors />
      </AuthDarkThemeScope>
    </QueryClientProvider>
  );
}
