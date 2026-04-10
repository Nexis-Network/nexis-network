/**
 * Model Tier Check Hook
 * 
 * Domain: Chat/Billing
 * Responsibility: Manages model tier access checks and upgrade modal state
 * Depends on: model-router, model-tier-upgrade-modal
 * Notes: Used by chat components to verify model access before requests
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { UserTier, ModelTier } from "@/components/chat/model-tier-upgrade-modal";
import { canAccessModelTier, getRequiredTierForModel } from "@/components/chat/model-tier-upgrade-modal";
import { USER_TIER_MAX_MODEL, mapModelIdToTier } from "@/modules/ai/model-router";

type UseModelTierCheckOptions = {
  userTier?: UserTier;
  onUpgradeRedirect?: () => void;
};

type ModelTierCheckResult = {
  // Modal state
  isUpgradeModalOpen: boolean;
  setUpgradeModalOpen: (open: boolean) => void;
  
  // Current modal context
  currentTier: UserTier;
  requiredTier: UserTier;
  requestedModelTier: ModelTier;
  
  // Check functions
  checkModelAccess: (modelId: string) => boolean;
  requireModelAccess: (modelId: string) => boolean;
  
  // Actions
  handleUpgrade: () => void;
};

/**
 * Hook to manage model tier access checks and upgrade prompts
 */
export function useModelTierCheck(options: UseModelTierCheckOptions = {}): ModelTierCheckResult {
  const router = useRouter();
  const { userTier = "free", onUpgradeRedirect } = options;

  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [requestedModelTier, setRequestedModelTier] = useState<ModelTier>("mini");

  /**
   * Check if user can access a model - does NOT trigger modal
   */
  const checkModelAccess = useCallback((modelId: string): boolean => {
    const modelTier = mapModelIdToTier(modelId);
    return canAccessModelTier(userTier, modelTier);
  }, [userTier]);

  /**
   * Require access to a model - triggers modal if access denied
   * Returns true if access granted, false if modal shown
   */
  const requireModelAccess = useCallback((modelId: string): boolean => {
    const modelTier = mapModelIdToTier(modelId);
    const hasAccess = canAccessModelTier(userTier, modelTier);

    if (!hasAccess) {
      setRequestedModelTier(modelTier);
      setUpgradeModalOpen(true);
      return false;
    }

    return true;
  }, [userTier]);

  /**
   * Handle upgrade button click
   */
  const handleUpgrade = useCallback(() => {
    setUpgradeModalOpen(false);
    
    if (onUpgradeRedirect) {
      onUpgradeRedirect();
    } else {
      // Default: redirect to billing page
      router.push("/settings/billing");
    }
  }, [router, onUpgradeRedirect]);

  /**
   * Get required tier for requested model
   */
  const requiredTier = useMemo(() => {
    return getRequiredTierForModel(requestedModelTier);
  }, [requestedModelTier]);

  return {
    isUpgradeModalOpen,
    setUpgradeModalOpen,
    currentTier: userTier,
    requiredTier,
    requestedModelTier,
    checkModelAccess,
    requireModelAccess,
    handleUpgrade,
  };
}

/**
 * Server-side model access check
 * Use this in API routes to validate model access
 */
export function validateModelAccess(
  userTier: UserTier,
  modelId: string
): { allowed: boolean; requiredTier?: UserTier; message?: string } {
  const modelTier = mapModelIdToTier(modelId);
  const hasAccess = canAccessModelTier(userTier, modelTier);

  if (hasAccess) {
    return { allowed: true };
  }

  const requiredTier = getRequiredTierForModel(modelTier);
  return {
    allowed: false,
    requiredTier,
    message: `Model tier "${modelTier}" requires a ${requiredTier} subscription. Current tier: ${userTier}`,
  };
}

// Re-export types for convenience
export type { UserTier, ModelTier };
export { USER_TIER_MAX_MODEL };

