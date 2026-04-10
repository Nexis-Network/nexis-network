"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AssetSelect, assetOptionFromValue, type AssetSelectValue } from "@/components/agents/asset-select";
import { ChainSelect, chainOptionFromValue } from "@/components/agents/chain-select";
import { PriceInput } from "@/components/agents/price-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ListingType = "sale" | "rent" | "usage";

type AgentListingsManagerProps = {
  agentId: string;
  canManage: boolean;
};

export function AgentListingsManager({ agentId, canManage }: AgentListingsManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [listingType, setListingType] = useState<ListingType>("rent");
  const [networkId, setNetworkId] = useState<string>("eip155:8453");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [priceBaseUnits, setPriceBaseUnits] = useState<string>("0");
  const [currencySymbol, setCurrencySymbol] = useState<string>("USDC");
  const [currencyDecimals, setCurrencyDecimals] = useState<number>(6);

  const chain = useMemo(() => chainOptionFromValue(networkId), [networkId]);
  const asset = useMemo(() => assetOptionFromValue(networkId, assetId), [networkId, assetId]);

  if (!canManage) return null;

  return (
    <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-regular text-white">Manage listings</h2>
        <p className="text-sm text-muted-foreground">Publish pricing entries to enable sale, rental, or usage access.</p>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Add listing
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Create listing</DialogTitle>
            <DialogDescription>Listings are scoped to your workspace and enforced server-side.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="listing-type">Listing type</Label>
              <Select value={listingType} onValueChange={(value) => setListingType(value as ListingType)}>
                <SelectTrigger id="listing-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="listing-network">Network</Label>
              <ChainSelect
                value={networkId}
                id="listing-network"
                onChange={(option) => {
                  setNetworkId(option.caip2);
                  setAssetId(null);
                  setCurrencySymbol(option.nativeSymbol);
                  setCurrencyDecimals(option.nativeDecimals);
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="listing-asset">Asset</Label>
              <AssetSelect
                id="listing-asset"
                chainId={networkId}
                value={assetId ?? undefined}
                onChange={(option: AssetSelectValue) => {
                  setAssetId(option.caip19 ?? null);
                  setCurrencySymbol(option.symbol);
                  setCurrencyDecimals(option.decimals);
                }}
              />
              <p className="text-xs text-muted-foreground/70">
                {asset?.label ?? chain?.nativeSymbol ?? "Native"} pricing on {chain?.label ?? networkId}.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="listing-price">Price (base units)</Label>
              <PriceInput
                id="listing-price"
                value={priceBaseUnits}
                onChange={setPriceBaseUnits}
                decimals={currencyDecimals}
                onDecimalsChange={setCurrencyDecimals}
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="listing-symbol">Currency symbol</Label>
              <Input
                id="listing-symbol"
                value={currencySymbol}
                onChange={(event) => setCurrencySymbol(event.target.value.slice(0, 12))}
                className="bg-black/40"
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  setSaving(true);
                  const response = await fetch(`/api/agents/${agentId}/listings`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      listingType,
                      active: true,
                      prices: [
                        {
                          networkId,
                          assetId: assetId ?? null,
                          priceBaseUnits,
                          currencySymbol: currencySymbol.trim() || null,
                          currencyDecimals,
                        },
                      ],
                    }),
                  });

                  const payload = await response.json().catch(() => ({}));
                  if (!response.ok) {
                    const message = payload?.message ?? payload?.error ?? `Listing creation failed (${response.status})`;
                    throw new Error(message);
                  }

                  toast.success("Listing created", { description: "Pricing is now available in the marketplace." });
                  setOpen(false);
                  router.refresh();
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Unable to create listing.";
                  toast.error(message);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || !priceBaseUnits.trim()}
            >
              {saving ? "Saving…" : "Publish listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
