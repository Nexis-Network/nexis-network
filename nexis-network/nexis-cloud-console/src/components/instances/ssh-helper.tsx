"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SshHelperProps = {
  host: string;
  port: string;
  command: string;
};

export function SshHelper({ host, port, command }: SshHelperProps) {
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3 text-sm text-text-secondary">
      <div>
        <div className="text-xs text-text-muted">SSH Host</div>
        <div className="font-mono break-all text-text-primary">{host}</div>
      </div>
      <div>
        <div className="text-xs text-text-muted">Port</div>
        <div className="font-mono text-text-primary">{port}</div>
      </div>
      <div>
        <div className="text-xs text-text-muted">Command</div>
        <div className="rounded-md border border-border-default bg-background-surface p-3 font-mono text-xs text-text-primary break-all">
          {command}
        </div>
      </div>
      <Button type="button" size="sm" onClick={copyCommand}>
        {copied ? "Copied" : "Copy SSH command"}
      </Button>
    </div>
  );
}
