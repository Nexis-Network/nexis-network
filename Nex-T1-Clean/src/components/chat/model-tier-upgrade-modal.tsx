"use client";

/**
 * Model Tier Upgrade Modal
 * 
 * Domain: Chat/Billing
 * Responsibility: Displays upgrade prompt when user tries to access a model tier above their subscription
 * Depends on: ui/dialog, ui/button
 * Notes: Shows when free users try to access pro/enterprise models
 */

import { memo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Shield, Sparkles } from "lucide-react";

export type UserTier = "free" | "pro" | "ultra" | "enterprise";
export type ModelTier = "nano" | "mini" | "standard" | "premium" | "thinking";

const TIER_DISPLAY_NAMES: Record<UserTier, string> = {
  free: "Free",
  pro: "Pro",
  ultra: "Ultra",
  enterprise: "Enterprise",
};

const MODEL_TIER_NAMES: Record<ModelTier, string> = {
  nano: "Nano",
  mini: "Mini",
  standard: "Standard",
  premium: "Premium",
  thinking: "Thinking",
};

const TIER_FEATURES: Record<UserTier, string[]> = {
  free: ["Nano & Mini models", "Basic tools", "Community support"],
  pro: ["All Standard & Premium models", "Advanced tools", "Priority support", "Higher rate limits"],
  ultra: ["Thinking model access", "Ultra-only tools (key export)", "Higher concurrency", "Priority support"],
  enterprise: ["Full Thinking model access", "Custom integrations", "24/7 support", "Unlimited usage"],
};

const TIER_ICONS: Record<UserTier, React.ReactNode> = {
  free: <Zap className="h-5 w-5 text-muted-foreground" />,
  pro: <Crown className="h-5 w-5 text-amber-500" />,
  ultra: <Sparkles className="h-5 w-5 text-sky-500" />,
  enterprise: <Shield className="h-5 w-5 text-violet-500" />,
};

type ModelTierUpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: UserTier;
  requiredTier: UserTier;
  requestedModelTier: ModelTier;
  onUpgrade?: () => void;
};

export const ModelTierUpgradeModal = memo(function ModelTierUpgradeModal({
  open,
  onOpenChange,
  currentTier,
  requiredTier,
  requestedModelTier,
  onUpgrade,
}: ModelTierUpgradeModalProps) {
  const handleUpgradeClick = useCallback(() => {
    onOpenChange(false);
    onUpgrade?.();
  }, [onOpenChange, onUpgrade]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Upgrade Required</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            The <span className="font-semibold text-foreground">{MODEL_TIER_NAMES[requestedModelTier]}</span> model tier 
            requires a <span className="font-semibold text-foreground">{TIER_DISPLAY_NAMES[requiredTier]}</span> subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current tier */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              {TIER_ICONS[currentTier]}
              <span className="text-sm font-medium">Your current plan</span>
              <Badge variant="secondary" className="ml-auto">
                {TIER_DISPLAY_NAMES[currentTier]}
              </Badge>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {TIER_FEATURES[currentTier].map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Required tier */}
          <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              {TIER_ICONS[requiredTier]}
              <span className="text-sm font-medium">Unlock with</span>
              <Badge className="ml-auto bg-primary text-primary-foreground">
                {TIER_DISPLAY_NAMES[requiredTier]}
              </Badge>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {TIER_FEATURES[requiredTier].map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={handleClose} className="w-full sm:w-auto">
            Maybe later
          </Button>
          <Button onClick={handleUpgradeClick} className="w-full sm:w-auto">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to {TIER_DISPLAY_NAMES[requiredTier]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

/**
 * Determines if a user tier can access a model tier
 */
export function canAccessModelTier(userTier: UserTier, modelTier: ModelTier): boolean {
  const USER_TIER_MAX_MODEL: Record<UserTier, ModelTier> = {
    free: "mini",
    pro: "premium",
    ultra: "thinking",
    enterprise: "thinking",
  };

  const tierRanking: ModelTier[] = ["nano", "mini", "standard", "premium", "thinking"];
  const maxAllowed = USER_TIER_MAX_MODEL[userTier];
  const maxIndex = tierRanking.indexOf(maxAllowed);
  const requestedIndex = tierRanking.indexOf(modelTier);

  return requestedIndex <= maxIndex;
}

/**
 * Gets the required user tier for a model tier
 */
export function getRequiredTierForModel(modelTier: ModelTier): UserTier {
  const tierRanking: ModelTier[] = ["nano", "mini", "standard", "premium", "thinking"];
  const modelIndex = tierRanking.indexOf(modelTier);

  if (modelIndex <= 1) return "free"; // nano, mini
  if (modelIndex <= 3) return "pro"; // standard, premium
  return "ultra"; // thinking
}
