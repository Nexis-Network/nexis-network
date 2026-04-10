"use client";

import { Loader2, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCdpMfa, type TotpSetupResult } from "@/lib/hooks/cdp/use-cdp-mfa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { BentoCard } from "@/components/settings/shared/bento-card";

import { MfaEnableDialog } from "./mfa/mfa-enable-dialog";
import { MfaDisableDialog } from "./mfa/mfa-disable-dialog";

import { useCallback, useState } from "react";
export function CdpMfaCard() {
  const {
    isLoading,
    isEnabled,
    enableTotp,
    verifyTotp,
    disableTotp,
    isEnabling,
    isVerifying,
    isDisabling,
  } = useCdpMfa();

  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [setupData, setSetupData] = useState<TotpSetupResult | null>(null);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);

  const handleStartEnable = useCallback(async () => {
    setEnableError(null);
    setSetupData(null);
    try {
      const data = await enableTotp();
      setSetupData(data);
      setEnableDialogOpen(true);
    } catch (err) {
      setEnableError(err instanceof Error ? err.message : "Failed to start 2FA setup");
    }
  }, [enableTotp]);

  const handleCloseEnable = useCallback((open: boolean) => {
    if (!open) setSetupData(null);
    setEnableDialogOpen(open);
  }, []);

  const handleDisableConfirm = useCallback(
    async (code: string) => {
      await disableTotp(code);
      setDisableDialogOpen(false);
    },
    [disableTotp],
  );

  return (
    <>
      <BentoCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-400" />
            <h3 className="settings-card-title">Two-Factor Authentication</h3>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              isEnabled
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
            )}
          >
            {isLoading ? "Loading..." : isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        <p className="settings-card-description">
          Add an extra layer of security by requiring a time-based one-time password (TOTP) from
          your authenticator app when performing sensitive actions.
        </p>

        {enableError && !enableDialogOpen && <p className="text-xs text-red-400">{enableError}</p>}

        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Button variant="outline" size="sm" onClick={() => setDisableDialogOpen(true)} disabled={isLoading || isDisabling}>
              {isDisabling ? (<><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Disabling...</>) : "Disable 2FA"}
            </Button>
          ) : (
            <Button size="sm" onClick={handleStartEnable} disabled={isLoading || isEnabling}>
              {isEnabling ? (<><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Setting up...</>) : "Enable 2FA"}
            </Button>
          )}
        </div>
      </BentoCard>

      <MfaEnableDialog
        open={enableDialogOpen}
        onOpenChange={handleCloseEnable}
        setupData={setupData}
        onVerify={verifyTotp}
        isVerifying={isVerifying}
      />

      <MfaDisableDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        onConfirm={handleDisableConfirm}
        isDisabling={isDisabling}
      />
    </>
  );
}
