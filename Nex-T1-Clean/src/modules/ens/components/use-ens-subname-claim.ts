"use client";

import { useEffect, useState } from "react";

import { submitOnboarding, type OnboardingData } from "@/server/actions/onboarding";
import { useCdpTransactions } from "@/lib/cdp/use-cdp-transactions";
import {
  type EnsStatus,
  type PreparedClaim,
  readEnsApi,
  waitForEns,
} from "./use-ens-subname-claim.api";

export function useEnsSubnameClaim(options: {
  initialLabel?: string;
  onboardingData?: OnboardingData | null;
  onActive?: (ensName: string) => void;
}) {
  const cdpTransactions = useCdpTransactions();
  const [label, setLabel] = useState(options.initialLabel ?? "");
  const [status, setStatus] = useState<EnsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus(): Promise<EnsStatus> {
    const nextStatus = await readEnsApi<EnsStatus>("/api/ens/subnames");
    setStatus(nextStatus);
    return nextStatus;
  }

  async function waitForActiveClaim(): Promise<EnsStatus> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const nextStatus = await refreshStatus();
      if (nextStatus.claim?.status === "active") {
        return nextStatus;
      }
      if (nextStatus.claim?.status === "failed") {
        throw new Error(nextStatus.claim.last_error ?? "ENS claim failed.");
      }
      await waitForEns(3000);
    }

    throw new Error("ENS claim is still processing. Please refresh in a moment.");
  }

  useEffect(() => {
    let active = true;

    void refreshStatus()
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Failed to load ENS status.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (label.trim().length > 0) {
      return;
    }

    const suggested = status?.suggestedLabel?.trim();
    if (suggested) {
      setLabel(suggested);
    }
  }, [label, status?.suggestedLabel]);

  async function claimSubname() {
    setError(null);
    setIsSubmitting(true);

    try {
      if (options.onboardingData) {
        const profileSave = await submitOnboarding(options.onboardingData);
        if (profileSave?.error) {
          throw new Error(profileSave.error);
        }
      }

      if (!cdpTransactions.evmSmartAccount) {
        throw new Error("Your Nex Wallet is still initializing. Try again in a few seconds.");
      }

      const prepared = await readEnsApi<PreparedClaim>("/api/ens/subnames/claim", {
        method: "POST",
        body: JSON.stringify({ label }),
      });

      const [mainnetSignature, baseSignature] = await Promise.all([
        cdpTransactions.signEvmHash({ hash: prepared.mainnetReverseHash }),
        cdpTransactions.signEvmHash({ hash: prepared.baseReverseHash }),
      ]);

      await readEnsApi("/api/ens/subnames/finalize", {
        method: "POST",
        body: JSON.stringify({
          claimId: prepared.claim.id,
          mainnetReverseSignature: mainnetSignature.signature,
          baseReverseSignature: baseSignature.signature,
        }),
      });

      const activeStatus = await waitForActiveClaim();
      const ensName = activeStatus.claim?.ens_name ?? "";
      if (ensName) {
        options.onActive?.(ensName);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to claim ENS subname.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    cdpReady: Boolean(cdpTransactions.evmSmartAccount),
    error,
    isLoading,
    isSubmitting,
    label,
    setLabel,
    status,
    claimSubname,
    refreshStatus,
  };
}
