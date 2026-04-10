import { ChevronRight } from "lucide-react";
import type { PortfolioDashboardWallet } from "./portfolio-dashboard.types";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PortfolioDashboardTable({
  wallets,
}: {
  wallets: PortfolioDashboardWallet[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#121212]">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5 text-[10px] uppercase text-muted-foreground">
            <th className="px-6 py-4 font-medium">Wallet</th>
            <th className="px-6 py-4 text-right font-medium">Balance</th>
            <th className="px-6 py-4 text-right font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {wallets.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="px-6 py-12 text-center text-sm text-muted-foreground"
              >
                No assets found.
              </td>
            </tr>
          ) : (
            wallets.map((wallet) => (
              <tr
                key={wallet.walletId}
                className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      {wallet.providerName ?? "Wallet"}
                      {isCdpWallet(wallet) ? (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                          CDP
                        </span>
                      ) : null}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-white">
                  {wallet.tokens.length} assets
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 text-white">
                    <span>{usdFormatter.format(wallet.netWorthUsd || 0)}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function isCdpWallet(wallet: PortfolioDashboardWallet): boolean {
  return (
    typeof wallet.metadata === "object" &&
    wallet.metadata !== null &&
    !Array.isArray(wallet.metadata) &&
    wallet.metadata.provider === "cdp"
  );
}
