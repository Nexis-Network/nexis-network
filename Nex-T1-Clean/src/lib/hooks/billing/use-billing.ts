import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { useServerSessionReady } from "@/lib/hooks/auth/use-server-session-ready";


import { logger } from '@/lib/logger';
type BillingPlan = "free" | "pro" | "trader" | "ultra" | "enterprise";

type BillingRow = {
  plan: BillingPlan | null;
  stripe_customer_id: string | null;
  credits?: number | null;
};

type BillingRecord = Record<string, UntypedJson>;

const coerceBillingPlan = (value: string | null | undefined): BillingPlan => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "pro" || normalized === "trader" || normalized === "ultra" || normalized === "enterprise") {
    return normalized as BillingPlan;
  }
  return "free";
};

function pickString(record: BillingRecord | null | undefined, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function pickNumber(record: BillingRecord | null | undefined, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function normalizeBillingRow(
  record: BillingRecord | null | undefined,
  previous?: BillingRow | null,
): BillingRow {
  const fallback = previous ?? null;
  const normalizedPlan = coerceBillingPlan(
    pickString(record, ["plan", "subscription_tier", "tier"]) ?? fallback?.plan ?? "free",
  );
  const stripeCustomerId =
    pickString(record, ["stripe_customer_id", "stripeCustomerId"]) ??
    fallback?.stripe_customer_id ??
    null;
  const credits =
    pickNumber(record, ["credits", "credit_balance", "credits_balance"]) ??
    fallback?.credits ??
    0;

  return {
    plan: normalizedPlan,
    stripe_customer_id: stripeCustomerId,
    credits,
  };
}

export interface BillingState {
  plan: BillingPlan;
  credits: number;
  stripeCustomerId: string | null;
  loading: boolean;
  isPro: boolean;
  isEnterprise: boolean;
}

type UseBillingOptions = {
  enabled?: boolean;
};

export function useBilling(options: UseBillingOptions = {}): BillingState {
  // Use existing auth context which already handles session syncing/refreshing
  const { user, status } = useAuthContext();
  const { isReady: serverSessionReady } = useServerSessionReady();
  const isNonProductionTestMode =
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    ((window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true ||
      process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
      process.env.E2E_TEST_MODE === "true");
  const isUserLoading = status === "loading";
  const queryClient = useQueryClient();
  const billingKey = useMemo(() => ["billing", user?.id ?? "anon"], [user?.id]);

  const { data, isLoading: isQueryLoading } = useQuery<BillingRow | null>({
    queryKey: billingKey,
    queryFn: async () => {
      if (!user?.id) return null;

      const supabase = createClient();
      const primary = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (primary.error) {
        // Backward-compat: some environments still key user_profiles by `id`.
        const fallback = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (fallback.error) {
          logger.warn("[useBilling] Failed to fetch profile:", {
            primary: primary.error,
            fallback: fallback.error,
          });
          return null;
        }

        return normalizeBillingRow(
          (fallback.data && typeof fallback.data === "object"
            ? (fallback.data as BillingRecord)
            : null),
          null,
        );
      }

      return normalizeBillingRow(
        (primary.data && typeof primary.data === "object"
          ? (primary.data as BillingRecord)
          : null),
        null,
      );
    },
    enabled:
      Boolean(user?.id) &&
      options.enabled !== false &&
      !isNonProductionTestMode &&
      serverSessionReady,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (
      !user?.id ||
      options.enabled === false ||
      isNonProductionTestMode ||
      !serverSessionReady
    ) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`billing:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: unknown }) => {
          const row =
            payload.new && typeof payload.new === "object"
              ? (payload.new as BillingRecord)
              : null;

          queryClient.setQueryData<BillingRow | null>(billingKey, (prev) =>
            normalizeBillingRow(row, prev),
          );

          queryClient.invalidateQueries({ queryKey: billingKey, exact: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    billingKey,
    isNonProductionTestMode,
    options.enabled,
    queryClient,
    serverSessionReady,
    user?.id,
  ]);

  const plan = coerceBillingPlan(data?.plan);

  return {
    plan,
    credits: data?.credits ?? 0,
    stripeCustomerId: data?.stripe_customer_id ?? null,
    loading: isUserLoading || isQueryLoading,
    isPro: plan !== "free",
    isEnterprise: plan === "enterprise" || plan === "ultra",
  };
}
