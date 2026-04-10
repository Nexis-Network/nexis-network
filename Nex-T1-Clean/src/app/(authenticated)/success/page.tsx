import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { redis } from "@/server/services/redis";
import { getStripeClient } from "@/lib/stripe";
import { syncStripeDataToKV, type STRIPE_SUB_CACHE } from "@/lib/stripe-sync";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";

// Force dynamic rendering - this page requires runtime access to Redis and Stripe

function formatUnix(timestamp: number | null | undefined): string {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp * 1000).toLocaleDateString();
  } catch {
    return "—";
  }
}

type StripePaymentMethod =
  Extract<STRIPE_SUB_CACHE, { paymentMethod: UntypedJson }> extends {
    paymentMethod: infer P;
  }
    ? P
    : null;

function PaymentMethodSummary({
  paymentMethod,
}: {
  paymentMethod: StripePaymentMethod;
}) {
  if (!paymentMethod) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span>
      {(paymentMethod.brand ?? "Card").toUpperCase()} ••••{" "}
      {paymentMethod.last4 ?? "????"}
    </span>
  );
}

type ActiveSubscription = Exclude<STRIPE_SUB_CACHE, { status: "none" }>;

function isActiveSubscription(
  subscription: STRIPE_SUB_CACHE,
): subscription is ActiveSubscription {
  return subscription.status !== "none";
}

function ManageSubscription({
  subscription,
  customerPortalUrl,
}: {
  subscription: STRIPE_SUB_CACHE;
  customerPortalUrl: string;
}) {
  const activeSubscription = isActiveSubscription(subscription)
    ? subscription
    : null;
  const isActive = Boolean(activeSubscription);

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-regular">Manage subscription</h2>
            <p className="text-sm text-muted-foreground">
              {isActive
                ? `Current status: ${subscription.status}`
                : "No active subscription on file."}
            </p>
          </div>
          <Button asChild variant="outline">
            <a
              href={customerPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open customer portal
            </a>
          </Button>
        </div>

        {activeSubscription ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Subscription ID</dt>
              <dd className="font-medium">
                {activeSubscription.subscriptionId ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium">
                {activeSubscription.priceId ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Period start</dt>
              <dd className="font-medium">
                {formatUnix(activeSubscription.currentPeriodStart)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Period end</dt>
              <dd className="font-medium">
                {formatUnix(activeSubscription.currentPeriodEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment method</dt>
              <dd className="font-medium">
                <PaymentMethodSummary
                  paymentMethod={activeSubscription.paymentMethod ?? null}
                />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Renewal</dt>
              <dd className="font-medium">
                {activeSubscription.cancelAtPeriodEnd
                  ? "Cancels at period end"
                  : "Renews automatically"}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieBridge = createCookieBridge(await cookies());
  const { context } = await resolveSupabaseContext(cookieBridge, {
    refreshSession: false,
  });
  return context?.userId ?? null;
}

function SuccessPageFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-border/60 bg-card p-10 shadow-sm">
          <div className="h-8 w-64 animate-pulse rounded bg-accent/50" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-accent/40" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-accent/40" />
        </div>
      </div>
    </div>
  );
}

async function SuccessPageContent() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/");
  }

  const stripeCustomerId = await redis.get<string>(`stripe:user:${userId}`);
  if (!stripeCustomerId) {
    redirect("/");
  }

  const subscriptionData = await syncStripeDataToKV(stripeCustomerId);
  const stripe = getStripeClient();

  const { url: customerPortalUrl } = await stripe.billingPortal.sessions.create(
    {
      customer: stripeCustomerId,
      return_url:
        "https://www.newcult.co/registry/blocks/stripe-upstash-subscription/app/success",
    },
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-12 text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
          </div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Thank you for subscribing!
          </h1>

          <p className="text-lg text-muted-foreground">
            Your test subscription has been confirmed. This example showcases
            the Stripe + Upstash flow.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            This demo runs in Stripe test mode. Try card 4242 4242 4242 4242
            with any future date and CVC to explore the flow.
          </p>
        </div>

        <ManageSubscription
          subscription={subscriptionData}
          customerPortalUrl={customerPortalUrl}
        />

        <div className="mt-8 flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/registry/blocks/stripe-upstash-subscription/app">
              Back to home
            </Link>
          </Button>
          <Button asChild>
            <Link href="/registry/blocks/stripe-upstash-subscription/app">
              Start over
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessPageFallback />}>
      <SuccessPageContent />
    </Suspense>
  );
}
