"use client";

import { Loader2 } from "lucide-react";
import type { TotpSetupResult } from "@/lib/hooks/cdp/use-cdp-mfa";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCodeDisplay } from "./qr-code-display";
import { BackupCodesPanel } from "./backup-codes-panel";

interface MfaEnableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setupData: TotpSetupResult | null;
  onVerify: (code: string) => Promise<boolean>;
  isVerifying: boolean;
}

export function MfaEnableDialog({
  open,
  onOpenChange,
  setupData,
  onVerify,
  isVerifying,
}: MfaEnableDialogProps) {
  const [verifyCode, setVerifyCode] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifyInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setVerifyCode("");
    setSetupComplete(false);
    setError(null);
  }, [onOpenChange]);

  const handleVerify = useCallback(async () => {
    if (verifyCode.length !== 6) return;
    setError(null);

    try {
      const verified = await onVerify(verifyCode);
      if (verified) {
        setSetupComplete(true);
      } else {
        setError("Invalid code. Please check your authenticator app and try again.");
        setVerifyCode("");
        verifyInputRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerifyCode("");
      verifyInputRef.current?.focus();
    }
  }, [verifyCode, onVerify]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {setupComplete ? "2FA Enabled" : "Set Up Two-Factor Authentication"}
          </DialogTitle>
          <DialogDescription>
            {setupComplete
              ? "Two-factor authentication has been enabled for your account."
              : "Scan the QR code with your authenticator app, then enter the 6-digit code to verify."}
          </DialogDescription>
        </DialogHeader>

        {setupComplete && setupData ? (
          <BackupCodesPanel codes={setupData.backupCodes} />
        ) : setupData ? (
          <div className="space-y-4">
            <QrCodeDisplay qrCodeUri={setupData.qrCodeUri} secret={setupData.secret} />

            <div className="space-y-2">
              <label htmlFor="mfa-verify-code" className="text-xs font-medium text-[var(--bento-text-muted)]">
                Enter 6-digit code from your app
              </label>
              <Input
                ref={verifyInputRef}
                id="mfa-verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter") void handleVerify(); }}
                className="text-center font-mono text-lg tracking-[0.3em]"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {setupComplete ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleVerify} disabled={verifyCode.length !== 6 || isVerifying}>
                {isVerifying ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Verifying...</>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
