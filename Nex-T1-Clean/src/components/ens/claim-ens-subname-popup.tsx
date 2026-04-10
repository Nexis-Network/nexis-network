"use client";

import dynamic from "next/dynamic";

import { ENS_SUBNAME_CLAIM_ENABLED } from "@/modules/ens/feature";

const EnsSubnameClaimDialog = ENS_SUBNAME_CLAIM_ENABLED
  ? dynamic(
      () =>
        import("@/modules/ens/components/ens-subname-claim-dialog").then(
          (mod) => mod.EnsSubnameClaimDialog,
        ),
      { ssr: false, loading: () => null },
    )
  : null;

export function ClaimEnsSubnamePopup() {
  if (!EnsSubnameClaimDialog) {
    return null;
  }

  return <EnsSubnameClaimDialog />;
}
