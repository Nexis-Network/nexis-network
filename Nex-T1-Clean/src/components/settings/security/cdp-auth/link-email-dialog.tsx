"use client";

import { Loader2, Check } from "lucide-react";
import { useState, useCallback, useRef } from "react";

import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LinkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkEmail: (email: string) => Promise<{ flowId: string }>;
  onVerify: (flowId: string, code: string) => Promise<void>;
  isLinking: boolean;
  isVerifying: boolean;
}

export function LinkEmailDialog({
  open,
  onOpenChange,
  onLinkEmail,
  onVerify,
  isLinking,
  isVerifying,
}: LinkEmailDialogProps) {
  const [step, setStep] = useState<"email" | "verify" | "done">("email");
  const [email, setEmail] = useState("");
  const [flowId, setFlowId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep("email");
    setEmail("");
    setFlowId("");
    setCode("");
    setError(null);
  }, []);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetState();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState],
  );

  const handleSendCode = useCallback(async () => {
    if (!email.trim()) return;
    setError(null);
    try {
      const result = await onLinkEmail(email.trim());
      setFlowId(result.flowId);
      setStep("verify");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    }
  }, [email, onLinkEmail]);

  const handleVerifyCode = useCallback(async () => {
    if (code.length !== 6) return;
    setError(null);
    try {
      await onVerify(flowId, code);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setCode("");
      codeInputRef.current?.focus();
    }
  }, [code, flowId, onVerify]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{step === "done" ? "Email Linked" : "Link Email Address"}</DialogTitle>
          <DialogDescription>
            {step === "email" && "Enter the email address you want to link to your account."}
            {step === "verify" && `We sent a verification code to ${email}. Enter it below.`}
            {step === "done" && "Your email address has been successfully linked."}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSendCode(); }}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-2">
            <label htmlFor="link-verify-code" className="text-xs font-medium text-[var(--bento-text-muted)]">
              6-digit verification code
            </label>
            <Input
              ref={codeInputRef}
              id="link-verify-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") void handleVerifyCode(); }}
              className="text-center font-mono text-lg tracking-[0.3em]"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center justify-center gap-2 py-2">
            <Check className="h-5 w-5 text-green-400" />
            <span className="text-sm text-green-400">{email} linked successfully</span>
          </div>
        )}

        <DialogFooter>
          {step === "email" && (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleSendCode} disabled={!email.trim() || isLinking}>
                {isLinking ? (<><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending...</>) : "Send Code"}
              </Button>
            </>
          )}
          {step === "verify" && (
            <>
              <Button variant="ghost" onClick={() => setStep("email")}>Back</Button>
              <Button onClick={handleVerifyCode} disabled={code.length !== 6 || isVerifying}>
                {isVerifying ? (<><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Verifying...</>) : "Verify"}
              </Button>
            </>
          )}
          {step === "done" && <Button onClick={() => handleClose(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
