"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/settings/shared/settings-button";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";
import { useCallback, useState } from "react";

interface QrCodeDisplayProps {
  qrCodeUri: string;
  secret: string;
}

export function QrCodeDisplay({ qrCodeUri, secret }: QrCodeDisplayProps) {
  const [secretCopied, setSecretCopied] = useState(false);

  const handleCopySecret = useCallback(() => {
    void navigator.clipboard.writeText(secret).then(() => {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    });
  }, [secret]);

  return (
    <div className="space-y-3">
      <div className="flex justify-center rounded-lg border border-[var(--bento-border)] bg-[var(--settings-card-bg)] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUri)}`}
          alt="Scan this QR code with your authenticator app"
          width={200}
          height={200}
          className="rounded"
        />
      </div>
      <p className="text-center text-xs text-[var(--bento-text-muted)]">
        Scan with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
      </p>

      <div className="space-y-1.5">
        <p className="text-xs text-[var(--bento-text-muted)]">Or enter this secret manually:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all rounded-md border border-[var(--bento-border)] bg-[var(--settings-elevated)] px-3 py-1.5 font-mono text-xs text-[var(--bento-text-primary)]/80">
            {secret}
          </code>
          <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={handleCopySecret}>
            {secretCopied ? <Check className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
