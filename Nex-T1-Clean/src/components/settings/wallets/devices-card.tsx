import { Shield, Loader2 } from "lucide-react";
import { useNexAccount } from "@/modules/wallets/nex/hooks/use-nex-account";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";

import { logger } from '@/lib/logger';
import { createNexPublicClient } from "@/modules/wallets/nex/client-factory";
import { useQuery } from "@tanstack/react-query";
import { BentoCard } from "@/components/settings/shared/bento-card";
// Constants for ABIs
const SAFE_OWNERS_ABI = [
  {
    name: "getOwners",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
] as const;

export function DevicesCard() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const { evm } = useNexAccount(userId);
  const address = evm.smartAccountAddress;
  const chainId = evm.chainId;
  // ...
  const { data: owners, isLoading } = useQuery({
    queryKey: ["safe-owners", address, chainId],
    enabled: !!address && !!chainId,
    queryFn: async () => {
      if (!address) return [];
      const client = createNexPublicClient(chainId);
      
      try {
        const safeOwners = await client.readContract({
          address,
          abi: SAFE_OWNERS_ABI,
          functionName: "getOwners",
        });
        return safeOwners.map(addr => ({ 
          address: addr, 
          isCurrentDevice: addr.toLowerCase() === evm.ownerAddress?.toLowerCase(),
          label: addr.toLowerCase() === evm.ownerAddress?.toLowerCase() ? "Current Device" : "Authorized Signer",
          type: "safe"
        }));
      } catch (e) {
        logger.warn("Failed to retrieve Safe owners", e);
        return [];
      }
    },
  });
  // ... rest of render

  return (
    <BentoCard>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="settings-card-title">Devices & Keys</h3>
          <p className="settings-card-description">
            Manage the devices authorized to control your Smart Wallet.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled>
          Add Device
        </Button>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--bento-text-muted)]" />
          </div>
        ) : !owners?.length ? (
          <div className="py-6 text-center text-sm text-[var(--bento-text-muted)]">
            No active devices found.
          </div>
        ) : (
          <div className="settings-inline-list">
            {owners.map((owner) => (
              <div
                key={owner.address}
                className="settings-inline-row flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--settings-elevated)]/70 text-[var(--bento-text-primary)]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <span className="font-medium text-sm">
                        {owner.label || "Unknown Device"}
                      </span>
                      {owner.isCurrentDevice && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          This Device
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-[var(--bento-text-muted)] font-mono mt-0.5">
                      {truncateAddress(owner.address)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[var(--bento-text-muted)]">
                  {/* Actions or Status */}
                  <span className="text-[var(--settings-accent)]">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BentoCard>
  );
}

function truncateAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
