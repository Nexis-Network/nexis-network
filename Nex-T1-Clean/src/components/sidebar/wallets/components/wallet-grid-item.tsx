import { WalletSnapshot } from "@/modules/wallets/profile";
import { cn } from "@/lib/utils";
import { WalletBlockie } from "@/components/ui/wallet-blockie";

interface WalletGridItemProps {
  wallet: WalletSnapshot;
  isActive: boolean;
  onSelect: () => void;
}

export function WalletGridItem({
  wallet,
  isActive,
  onSelect,
}: WalletGridItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "group relative flex h-28 w-32 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border backbackdrop-blur-lg transition-all duration-150",
        isActive
          ? "border-white/30 bg-white/[0.11] shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/25"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 top-0 h-px transition-opacity",
          isActive ? "bg-white/35 opacity-100" : "bg-white/20 opacity-70",
        )}
      />
      <WalletBlockie
        address={wallet.address ?? ""}
        className="h-9 w-9"
        size={8}
        scale={4}
      />
      <div className="flex flex-col items-center gap-1 px-2">
        <span
            className={cn(
                "max-w-[90%] truncate text-xs font-medium transition-colors",
                isActive ? "text-white" : "text-white/70 group-hover:text-white"
            )}
        >
            {activeWalletLabel(wallet)}
        </span>
        <span className="font-mono text-[10px] text-white/45">
            {wallet.address ? `${wallet.address.slice(0,6)}...${wallet.address.slice(-4)}` : "Pending..."}
        </span>
      </div>
    </button>
  );
}

function activeWalletLabel(wallet: WalletSnapshot) {
     return wallet.customLabel ?? wallet.label ?? "Wallet";
}
