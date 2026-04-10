"use client";

import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, CreditCard, Key, Layers, Banknote } from "lucide-react";

// ---------------------------------------------------------------------------
// ActionButton (internal)
// ---------------------------------------------------------------------------

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 min-w-[3.5rem] flex-col items-center gap-1 rounded-lg border border-[var(--bento-border)] bg-[var(--settings-elevated)]/70 p-2 text-[var(--bento-text-muted)] transition-colors hover:bg-[var(--settings-elevated)]/90 hover:text-[var(--bento-text-primary)]"
      aria-label={label}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// CdpWalletActions
// ---------------------------------------------------------------------------

type CdpWalletActionsProps = {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
  onFund: () => void;
  onStake: () => void;
  onCashOut: () => void;
  onExport: () => void;
};

export function CdpWalletActions({
  onSend,
  onReceive,
  onSwap,
  onFund,
  onStake,
  onCashOut,
  onExport,
}: CdpWalletActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ActionButton
        icon={<ArrowUpRight className="h-4 w-4" />}
        label="Send"
        onClick={onSend}
      />
      <ActionButton
        icon={<ArrowDownLeft className="h-4 w-4" />}
        label="Receive"
        onClick={onReceive}
      />
      <ActionButton
        icon={<ArrowLeftRight className="h-4 w-4" />}
        label="Swap"
        onClick={onSwap}
      />
      <ActionButton
        icon={<CreditCard className="h-4 w-4" />}
        label="Fund"
        onClick={onFund}
      />
      <ActionButton
        icon={<Layers className="h-4 w-4" />}
        label="Stake"
        onClick={onStake}
      />
      <ActionButton
        icon={<Banknote className="h-4 w-4" />}
        label="Cash Out"
        onClick={onCashOut}
      />
      <ActionButton
        icon={<Key className="h-4 w-4" />}
        label="Export"
        onClick={onExport}
      />
    </div>
  );
}
