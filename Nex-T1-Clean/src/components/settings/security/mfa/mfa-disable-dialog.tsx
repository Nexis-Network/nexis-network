"use client";

import { Loader2 } from "lucide-react";
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

interface MfaDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (code: string) => Promise<void>;
  isDisabling: boolean;
}

export function MfaDisableDialog({ open, onOpenChange, onConfirm, isDisabling }: MfaDisableDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setCode("");
    setError(null);
  }, [onOpenChange]);

  const handleConfirm = useCallback(async () => {
    if (code.length !== 6) return;
    setError(null);

    try {
      await onConfirm(code);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA");
      setCode("");
      inputRef.current?.focus();
    }
  }, [code, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Enter your current 2FA code to confirm disabling two-factor authentication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="mfa-disable-code" className="text-xs font-medium text-[var(--bento-text-muted)]">
            Current 6-digit code
          </label>
          <Input
            ref={inputRef}
            id="mfa-disable-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => { if (e.key === "Enter") void handleConfirm(); }}
            className="text-center font-mono text-lg tracking-[0.3em]"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={code.length !== 6 || isDisabling}>
            {isDisabling ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Disabling...</>
            ) : (
              "Disable 2FA"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
