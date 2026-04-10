"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createCheckoutSession } from "@/app/(marketing)/actions";
import { CopyToClipboardWidget } from "@/components/shared/copy/copy-to-clipboard";

interface Feature {
  name: string;
  description: string;
}

interface StripeSubscriptionPlan {
  name: string;
  description: string;
  price: number;
  features: Feature[];
  priceId: string | null;
}

interface PricingCardProps {
  plan: StripeSubscriptionPlan;
  onBuyCoffee: () => Promise<void>;
}

export function PricingCard({ plan, onBuyCoffee }: PricingCardProps) {
  return (
    <TooltipProvider>
      <Card className="overflow-hidden rounded-[20px] border-0 bg-white shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)]">
        <CardContent className="grid grid-cols-[1fr_1px_1fr] gap-8 p-8">
          {/* Left side - Pricing Info */}
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="font-regular text-2xl text-zinc-900">
                  {plan.name}
                </h3>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-500 text-xs tracking-wide">
                  DEMO
                </span>
              </div>
              <p className="text-sm text-zinc-500">{plan.description}</p>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-4xl text-zinc-900">
                  ${plan.price}
                </span>
                <span className="font-medium text-sm text-zinc-500">
                  per month
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">Test mode enabled</p>
            </div>

            <Button
              className="h-11 w-full rounded-xl bg-indigo-500 px-6 font-medium text-sm text-white transition-colors hover:bg-indigo-600"
              disabled={!plan.priceId}
              onClick={onBuyCoffee}
            >
              Try Demo Subscription
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.33337 8H12.6667M12.6667 8L8.00004 3.33333M12.6667 8L8.00004 12.6667"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </Button>
          </div>

          {/* Divider */}
          <div className="h-full w-px bg-zinc-100" />

          {/* Right side - Features */}
          <div className="space-y-6">
            <h4 className="font-medium text-sm text-zinc-900">
              Everything you need for subscriptions
            </h4>
            <div className="space-y-4">
              {plan.features.map((feature) => (
                <Tooltip key={feature.name}>
                  <TooltipTrigger asChild>
                    <div className="group flex cursor-help items-start gap-3 text-zinc-600">
                      <div className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-indigo-50">
                        <Check className="h-3 w-3 stroke-[2.5px] text-indigo-500" />
                      </div>
                      <span className="text-sm leading-tight transition-colors group-hover:text-zinc-900">
                        {feature.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    className="max-w-[260px] text-sm leading-[1.4]"
                    sideOffset={5}
                  >
                    {feature.description}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default function CoffeeCard() {
  const examplePlan: StripeSubscriptionPlan = {
    name: "Stripe Subscription",
    description: "Complete subscription system with Stripe integration",
    price: 2.99,
    features: [
      {
        name: "Stripe Checkout Integration",
        description:
          "Ready-to-use Stripe Checkout with test mode configuration and custom success/cancel pages",
      },
      {
        name: "Customer Management",
        description:
          "Automatic customer creation and storage of Stripe customer IDs using Redis/Upstash",
      },
      {
        name: "Subscription Portal",
        description:
          "Built-in Stripe Customer Portal for managing subscriptions and payment methods",
      },
      {
        name: "Webhook Handler",
        description:
          "Pre-configured webhook endpoint for handling subscription events and syncing data",
      },
      {
        name: "Data Syncing",
        description:
          "Real-time subscription data synchronization between Stripe and your database",
      },
      {
        name: "Test Mode UI",
        description:
          "Developer-friendly UI with test card numbers and copy-to-clipboard functionality",
      },
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_COFFEE_ID ?? null,
  };

  const handleBuyCoffee = async () => {
    try {
      const priceId = examplePlan.priceId;
      if (!priceId) {
        toast.error(
          "Stripe demo pricing is not configured. Set NEXT_PUBLIC_STRIPE_COFFEE_ID to enable checkout."
        );
        return;
      }

      const result = await createCheckoutSession(priceId);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      window.location.href = result.url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  };

  return (
    <div className="mx-auto flex flex-col items-center space-y-6">
      <CopyToClipboardWidget
        helperText="Use any future expiry date and CVC"
        label="Test Mode Card:"
        text="4242 4242 4242 4242"
      />
      <PricingCard onBuyCoffee={handleBuyCoffee} plan={examplePlan} />
      <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        * This is not a real subscription, it is a demo of the Stripe
        subscription system.
      </p>
    </div>
  );
}
