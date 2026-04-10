"use client";

import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeEnsSubnameLabel } from "@/lib/ens/subnames";
import type { OnboardingData } from "@/server/actions/onboarding";

import { useEnsSubnameClaim } from "./use-ens-subname-claim";

type EnsSubnameClaimFormProps = {
  initialLabel?: string;
  onboardingData?: OnboardingData | null;
  onBack?: () => void;
  onComplete?: () => void;
  title: string;
  description: string;
  claimButtonLabel?: string;
};

function renderStatusLabel(status: string | undefined) {
  switch (status) {
    case "pending_signature":
      return "Waiting for wallet signature";
    case "queued":
      return "Queued for gas-sponsored mint";
    case "processing":
    case "pending_mainnet":
    case "pending_reverse":
      return "Minting your ENS subname";
    case "active":
      return "ENS subname ready";
    case "failed":
      return "Claim failed";
    default:
      return "Preparing claim";
  }
}

export function EnsSubnameClaimForm({
  initialLabel,
  onboardingData = null,
  onBack,
  onComplete,
  title,
  description,
  claimButtonLabel = "Claim free subname",
}: EnsSubnameClaimFormProps) {
  const router = useRouter();
  const {
    cdpReady,
    error,
    isLoading,
    isSubmitting,
    label,
    setLabel,
    status,
    claimSubname,
  } = useEnsSubnameClaim({
    initialLabel,
    onboardingData,
    onActive: () => {
      router.refresh();
      onComplete?.();
    },
  });

  const activeEnsName = status?.claim?.status === "active" ? status.claim.ens_name : null;
  const walletAddress = status?.walletAddress ?? null;
  const canSubmit = status?.canClaim ?? true;
  const claimAvailabilityError = status?.claimAvailabilityError ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[28px] font-medium leading-[39px] tracking-[-0.16px] text-white">
          {title}
        </h1>
        <p className="text-[14px] leading-[22px] tracking-[-0.16px] text-[#808793]">
          {description}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-white">
          <Sparkles className="size-4 text-[#0BA0A6]" />
          <span>One free `*.nex-t1.eth` name per user</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ens-label" className="text-white">
            Choose your label
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="ens-label"
              value={label}
              onChange={(event) => setLabel(normalizeEnsSubnameLabel(event.target.value))}
              placeholder="your-name"
              className="border-[#36393F] bg-transparent text-white placeholder:text-[#808793]"
              disabled={isSubmitting || Boolean(activeEnsName)}
            />
            <span className="shrink-0 text-sm text-[#808793]">.nex-t1.eth</span>
          </div>
          {status?.validationError ? (
            <p className="text-sm text-amber-300">{status.validationError}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#111214] p-4 text-sm text-[#B7BDC7]">
        <div className="mb-2 flex items-center gap-2 text-white">
          <Wallet className="size-4 text-[#0BA0A6]" />
          <span>Embedded wallet</span>
        </div>
        <p>{walletAddress ?? "Provisioning your CDP smart wallet..."}</p>
        <p className="mt-2 text-xs text-[#808793]">
          {cdpReady
            ? "Wallet signing is ready."
            : "You must be signed into your Nex Wallet before the ENS claim can be signed."}
        </p>
      </div>

      {status?.claim ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="text-white">{renderStatusLabel(status.claim.status)}</p>
          <p className="mt-1 text-[#808793]">
            {status.claim.ens_name}
            {status.claim.status === "active" ? " is now attached to your wallet." : ""}
          </p>
        </div>
      ) : null}

      {claimAvailabilityError ? (
        <p className="text-sm text-amber-300">{claimAvailabilityError}</p>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex w-full gap-4">
        {onBack ? (
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 border-[#36393F] bg-transparent text-white hover:bg-white/5"
            size="lg"
          >
            Back
          </Button>
        ) : null}
        <Button
          onClick={() => void claimSubname()}
          disabled={
            isLoading ||
            isSubmitting ||
            !canSubmit ||
            !cdpReady ||
            label.trim().length < 3 ||
            Boolean(activeEnsName)
          }
          className="flex-1 bg-white text-black hover:bg-white/90"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Claiming...
            </>
          ) : activeEnsName ? (
            "Continue"
          ) : (
            claimButtonLabel
          )}
        </Button>
      </div>
    </div>
  );
}
