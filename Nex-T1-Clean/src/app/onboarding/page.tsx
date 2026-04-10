"use client";


import { useMemo, useEffect, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";


import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { SupabaseAuthBoundary } from "@/components/providers/supabase-auth-provider";
import { isLegacyMigratedUser } from "@/lib/auth/onboarding-status";


import { logger } from '@/lib/logger';
// Skip static prerender — React SSR context unavailable during build

function OnboardingFallback({ message }: { message: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function OnboardingPageContent() {
  const { status, isSyncing, user } = useAuthContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const redirectTo = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const canQueryProfile =
    typeof window !== "undefined" &&
    Boolean(user?.id) &&
    status === "authenticated";

  const { data: profile, isLoading: isProfileLoading } = useQuery({
      queryKey: ["user-profile-onboarding", user?.id],
      queryFn: async () => {
          if (!user?.id) return null;
          try {
            const response = await fetch("/api/auth/profile", {
              credentials: "include",
              cache: "no-store",
            });
            if (!response.ok) {
              return null;
            }
            const result = await response.json();
            if (result.success && result.data) {
              return { onboarding_completed: result.data.onboarding_completed ?? false };
            }
            return null;
          } catch (error) {
            logger.warn(
              "Onboarding profile fallback failed:",
              error instanceof Error ? error.message : String(error),
            );
            return null;
          }
      },
      enabled: canQueryProfile,
      staleTime: 5 * 60 * 1000,
  });

  const isLegacyUser =
    user && typeof (user as { created_at?: string | null }).created_at === "string"
      ? isLegacyMigratedUser((user as { created_at?: string | null }).created_at)
      : false;
  const isOnboarded = profile?.onboarding_completed === true || (profile == null && isLegacyUser);

  useEffect(() => {
      if (status === "authenticated" && isOnboarded) {
          router.replace("/app");
      }
  }, [status, isOnboarded, router]);

  if (status === "loading" || isSyncing || (status === "authenticated" && isProfileLoading)) {
    return <OnboardingFallback message="Checking your session…" />;
  }
  
  // If redirecting...
  if (status === "authenticated" && isOnboarded) {
      return <OnboardingFallback message="Redirecting to app..." />;
  }

  if (status === "signed_out" || status === "unconfigured") {
    const signInHref = `/auth?view=sign-in&redirectTo=${encodeURIComponent(redirectTo)}`;
    return <OnboardingFallback message={`Please sign in to continue onboarding. Redirect: ${signInHref}`} />;
  }

  return (
    <main>
      <OnboardingForm />
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <SupabaseAuthBoundary>
      <Suspense fallback={<OnboardingFallback message="Loading onboarding..." />}>
        <OnboardingPageContent />
      </Suspense>
    </SupabaseAuthBoundary>
  );
}
