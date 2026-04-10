"use client";

import { Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/settings/shared/settings-button";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";
import { useCallback, useState } from "react";

export function BackupCodesPanel({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = codes.join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [codes]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-medium text-yellow-400">
          Save these backup codes. They will not be shown again.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-[var(--bento-border)] bg-[var(--bento-card)] p-3">
        {codes.map((code) => (
          <code key={code} className="text-center mono-value text-xs text-[var(--bento-text-primary)]/80">{code}</code>
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={handleCopy}>
        {copied ? (<><Check className="mr-1.5 h-3.5 w-3.5" />Copied</>) : (<><CopyIcon className="mr-1.5 h-3.5 w-3.5" />Copy all codes</>)}
      </Button>
    </div>
  );
}
