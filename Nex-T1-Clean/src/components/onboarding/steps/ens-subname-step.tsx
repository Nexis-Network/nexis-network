"use client";

import { useRouter } from "next/navigation";

import type { OnboardingData } from "@/server/actions/onboarding";
import { EnsSubnameClaimForm } from "@/modules/ens/components/ens-subname-claim-form";

type EnsSubnameStepProps = {
  onboardingData: OnboardingData;
  onBack: () => void;
};

export function EnsSubnameStep({
  onboardingData,
  onBack,
}: EnsSubnameStepProps) {
  const router = useRouter();

  return (
    <EnsSubnameClaimForm
      initialLabel={onboardingData.username}
      onboardingData={onboardingData}
      onBack={onBack}
      onComplete={() => {
        router.refresh();
        router.push("/app");
      }}
      title="Claim your free `nex-t1.eth` subname"
      description="Your onboarding finishes once your embedded wallet owns its ENS subname. Nex-T1 sponsors the gas."
      claimButtonLabel="Claim and finish onboarding"
    />
  );
}
