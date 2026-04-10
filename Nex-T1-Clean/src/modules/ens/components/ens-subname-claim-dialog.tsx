"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";

import { EnsSubnameClaimForm } from "./ens-subname-claim-form";

type EnsSubnameClaimDialogProps = {
  onVisibilityChange?: (visible: boolean) => void;
};

export function EnsSubnameClaimDialog({
  onVisibilityChange,
}: EnsSubnameClaimDialogProps) {
  const router = useRouter();
  const { data: profileData } = useProfileAggregate();
  const [open, setOpen] = useState(false);
  const isMockProfile = profileData?.identity?.userId === 0;
  const canRenderClaimFlow =
    Boolean(profileData) && !isMockProfile && !profileData?.identity?.ensName;

  useEffect(() => {
    const shouldOpen = canRenderClaimFlow;
    setOpen(shouldOpen);
    onVisibilityChange?.(shouldOpen);
  }, [canRenderClaimFlow, onVisibilityChange]);

  if (!canRenderClaimFlow || !profileData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl border-white/10 bg-[#111214]/95">
        <DialogHeader>
          <DialogTitle>Claim your free ENS subname</DialogTitle>
          <DialogDescription>
            Your Nex Wallet can claim one gas-sponsored `*.nex-t1.eth` name.
          </DialogDescription>
        </DialogHeader>
        <EnsSubnameClaimForm
          initialLabel={profileData?.identity?.username ?? ""}
          title="Claim your free ENS subname"
          description="Mint a `*.nex-t1.eth` identity for your embedded wallet. Gas is sponsored by Nex-T1."
          onComplete={() => {
            setOpen(false);
            onVisibilityChange?.(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
