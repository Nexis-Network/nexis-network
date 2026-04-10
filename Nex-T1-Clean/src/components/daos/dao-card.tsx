import Link from "next/link";
import { ArrowUpRight, Coins, Layers3, ShieldCheck, Vote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DaoCardProps = {
  dao: {
    daoId: string;
    slug: string;
    name: string;
    description: string | null;
    category: string | null;
    ownershipMode: string;
    importSource: string;
    primaryChainFamily: string;
    treasuryValueUsd: number | null;
    activeProposalCount: number;
    memberCount: number;
    capabilityScore: number;
    lastActivityAt: string | null;
    isMine: boolean;
  };
};

function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Not indexed";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatRelativeDate(value: string | null): string {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DaoCard({ dao }: DaoCardProps) {
  return (
    <Card className="h-full border-border/70 bg-card/70 backbackdrop-blur-lg transition-colors hover:border-emerald-400/40">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{dao.primaryChainFamily.toUpperCase()}</Badge>
          <Badge variant="outline">{dao.ownershipMode}</Badge>
          <Badge variant="outline">{dao.importSource}</Badge>
          {dao.isMine ? <Badge className="bg-emerald-500/15 text-emerald-300">Mine</Badge> : null}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-lg">{dao.name}</CardTitle>
          <CardDescription>
            {dao.description ?? "DAO workspace for proposals, treasury, memberships, and automation."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background/50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Coins className="size-3.5" />
            Treasury
          </div>
          <div className="mt-2 text-lg font-medium">
            {formatCurrency(dao.treasuryValueUsd)}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Vote className="size-3.5" />
            Active proposals
          </div>
          <div className="mt-2 text-lg font-medium">{dao.activeProposalCount}</div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Members
          </div>
          <div className="mt-2 text-lg font-medium">{dao.memberCount}</div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Layers3 className="size-3.5" />
            Capability score
          </div>
          <div className="mt-2 text-lg font-medium">{dao.capabilityScore}/8</div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="min-w-0">
          <div className="truncate text-sm text-muted-foreground">
            {dao.category ?? "Uncategorized"}
          </div>
          <div className="text-xs text-muted-foreground/80">
            Activity: {formatRelativeDate(dao.lastActivityAt)}
          </div>
        </div>

        <Link
          href={`/daos/${dao.daoId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-emerald-300"
        >
          Open
          <ArrowUpRight className="size-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
