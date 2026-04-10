"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";


import { ENS_SUBNAME_CLAIM_ENABLED } from "@/modules/ens/feature";

const AppReleasePopup = dynamic(
  () => import("@/components/app/app-release-popup").then((mod) => ({
      default: mod.AppReleasePopup,
  })),
  { ssr: false, loading: () => null },
);

const EnsSubnameClaimDialog = ENS_SUBNAME_CLAIM_ENABLED
  ? dynamic(
      () => import("@/modules/ens/components/ens-subname-claim-dialog").then((mod) => ({
          default: mod.EnsSubnameClaimDialog,
      })),
      { ssr: false, loading: () => null },
    )
  : null;

type AppChatShellPopupsProps = {
  isReleasePopupVisible: boolean;
  onReleasePopupVisibilityChange: (visible: boolean) => void;
};

export function AppChatShellPopups({
  isReleasePopupVisible,
  onReleasePopupVisibilityChange,
}: AppChatShellPopupsProps) {
  const [, setIsEnsPopupVisible] = useState(false);
  const shouldShowEnsClaimDialog =
    ENS_SUBNAME_CLAIM_ENABLED &&
    Boolean(EnsSubnameClaimDialog) &&
    !isReleasePopupVisible;

  return (
    <Suspense fallback={null}>
      <AppReleasePopup
        onVisibilityChange={onReleasePopupVisibilityChange}
      />
      {shouldShowEnsClaimDialog && EnsSubnameClaimDialog ? (
        <EnsSubnameClaimDialog onVisibilityChange={setIsEnsPopupVisible} />
      ) : null}
    </Suspense>
  );
}
