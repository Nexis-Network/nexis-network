"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { isLegacyMigratedUser } from "@/lib/auth/onboarding-status";

import { AppShellSkeleton } from "@/components/auth/app-shell-skeleton";


import { logger } from '@/lib/logger';
export function OnboardingGuard({ children }: { children: ReactNode }) {
    const { user, status } = useSupabaseAuth();
    const router = useRouter();
    const pathname = usePathname();
    const canQueryProfile =
      typeof window !== "undefined" &&
      Boolean(user?.id) &&
      status === "authenticated";

    const { data: profile, isLoading } = useQuery({
        queryKey: ["user-profile", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            // Mock user bypass: prevent 406 errors from invalid token against real backend
            if (user.id === "00000000-0000-0000-0000-000000000000") {
                return { onboarding_completed: true };
            }

            // Use server-side API route instead of Supabase client SDK
            // This prevents hanging when auth server is unreachable from browser
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
                
                const response = await fetch("/api/auth/profile", {
                    credentials: "include",
                    cache: "no-store",
                    signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    logger.warn("Profile fetch failed:", response.status);
                    return null;
                }
                
                const result = await response.json();
                if (result.success && result.data) {
                    return { onboarding_completed: result.data.onboarding_completed ?? false };
                }
                return null;
            } catch (error) {
                if ((error as Error).name === "AbortError") {
                    logger.warn("Profile fetch timed out");
                } else {
                    logger.warn("Profile fetch error:", error);
                }
                return null;
            }
        },
        enabled: canQueryProfile,
        // Don't refetch too often, onboarding status is stable usually
        staleTime: 5 * 60 * 1000, 
    });

    const isOnboardingRoute = pathname.startsWith("/onboarding");
    const isLegacyUser =
      user && typeof (user as { created_at?: string | null }).created_at === "string"
        ? isLegacyMigratedUser((user as { created_at?: string | null }).created_at)
        : false;
    const isOnboarded = profile?.onboarding_completed === true || (profile == null && isLegacyUser);

    useEffect(() => {
        if (isLoading || status !== "authenticated") return;

        // Case 1: User HAS completed onboarding, but is on onboarding page
        // -> Redirect to /app
        if (isOnboarded && isOnboardingRoute) {
            router.replace("/app");
            return;
        }

        // Case 2: User has NOT completed onboarding, and is NOT on onboarding page
        // -> Redirect to /onboarding
        if (!isOnboarded && !isOnboardingRoute) {
            router.replace("/onboarding");
            return;
        }
        
    }, [isLoading, status, isOnboarded, isOnboardingRoute, router]);

    const [showTimeoutError, setShowTimeoutError] = useState(false);

    useEffect(() => {
        if (status === "loading" || (status === "authenticated" && isLoading)) {
            const timer = setTimeout(() => setShowTimeoutError(true), 25000); // 25s timeout
            return () => clearTimeout(timer);
        }
        setShowTimeoutError(false);
    }, [status, isLoading]);

    if (status === "loading" || (status === "authenticated" && isLoading)) {
        if (showTimeoutError) {
            return (
                <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
                    <div className="text-xl font-semibold">Connection Timeout</div>
                    <p className="max-w-md text-muted-foreground">
                        We couldn&apos;t connect to the authentication server. This might be due to a network blocking the connection or a temporary service interruption.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                    >
                        Retry
                    </button>
                    <p className="text-xs text-muted-foreground/50">v2.1</p>
                </div>
            );
        }
        return <AppShellSkeleton />;
    }

    // While redirecting...
    if (status === "authenticated") {
       const shouldRedirectToApp = isOnboarded && isOnboardingRoute;
       const shouldRedirectToOnboarding = !isOnboarded && !isOnboardingRoute;

       if (shouldRedirectToApp || shouldRedirectToOnboarding) {
           return <AppShellSkeleton />;
       }
    }

    return <>{children}</>;
}
