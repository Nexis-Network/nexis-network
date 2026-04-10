"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type AttestationBadgeProps = {
  status: "verified" | "pending" | "failed";
  provider?: string | null;
  policyVersion?: string | null;
};

export function AttestationBadge({ status, provider, policyVersion }: AttestationBadgeProps) {
  const isVerified = status === "verified";
  const tone = isVerified
    ? "bg-[#8eb94f]/10 text-emerald-200 border-emerald-500/30"
    : status === "failed"
      ? "bg-rose-500/10 text-rose-100 border-rose-500/30"
      : "bg-amber-500/10 text-amber-100 border-amber-500/30";

  return (
    <Badge variant="outline" className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${tone}`}>
      {isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
      {isVerified ? "Attested" : status === "failed" ? "Attestation failed" : "Awaiting attestation"}
      {provider ? <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">{provider}</span> : null}
      {policyVersion ? <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">v{policyVersion}</span> : null}
    </Badge>
  );
}
