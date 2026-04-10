"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import type { AgentListingSummary } from "@/lib/agents/types";
import { formatListingPrice, humanizeListingType, humanizeNetwork } from "@/lib/agents/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_ORDER: AgentListingSummary["listingType"][] = ["sale", "rent", "usage"];

type AgentPricingPanelProps = {
  agentId: string;
  listings: AgentListingSummary[];
};

type ListingGroup = {
  type: AgentListingSummary["listingType"];
  summaries: AgentListingSummary[];
};

type RentalRow = {
  id: string;
  listing_id: string | null;
  state: string | null;
  start_ts: string | null;
  end_ts: string | null;
  terms?: Record<string, UntypedJson> | null;
};

type RentalSummary = {
  id: string;
  listingId: string;
  state: string;
  startTs: string | null;
  endTs: string | null;
};

export function AgentPricingPanel({ agentId, listings }: AgentPricingPanelProps) {
  const router = useRouter();
  const groups = useMemo(() => groupListings(listings), [listings]);
  const firstTab = groups[0]?.type ?? "sale";
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [rentals, setRentals] = useState<RentalSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/agents/${agentId}/rental`, { method: "GET", signal: controller.signal })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (!payload?.ok || !Array.isArray(payload?.rentals)) return;

        setRentals(
          (payload.rentals as RentalRow[])
            .map((row) => ({
              id: row.id,
              listingId: row.listing_id ?? "",
              state: typeof row.state === "string" ? row.state : "pending",
              startTs: row.start_ts ?? null,
              endTs: row.end_ts ?? null,
            }))
            .filter((row) => Boolean(row.listingId)),
        );
      })
      .catch(() => {})
      .finally(() => {});

    return () => controller.abort();
  }, [agentId]);

  const activeRentalByListing = useMemo(() => {
    const map = new Map<string, RentalSummary>();
    const now = Date.now();
    for (const rental of rentals) {
      if (rental.state !== "active") continue;
      if (rental.endTs) {
        const end = Date.parse(rental.endTs);
        if (Number.isFinite(end) && end <= now) continue;
      }
      if (!map.has(rental.listingId)) {
        map.set(rental.listingId, rental);
      }
    }
    return map;
  }, [rentals]);

  if (groups.length === 0) {
    return (
      <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <header>
          <h2 className="text-lg font-regular text-white">Pricing</h2>
          <p className="text-sm text-muted-foreground">
            This agent hasn’t published pricing yet. Contact the owner to negotiate a listing.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-regular text-white">Pricing</h2>
        <p className="text-sm text-muted-foreground">
          Select a pricing model to activate access (rental/usage) or copy a sale-listed configuration.
        </p>
      </header>
      <Tabs defaultValue={firstTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {TAB_ORDER.map((tab) => (
            <TabsTrigger key={tab} value={tab} disabled={!groups.find((group) => group.type === tab)}>
              {humanizeListingType(tab)}
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((group) => (
          <TabsContent key={group.type} value={group.type} className="space-y-3">
            {group.summaries.map((summary) => (
              <article
                key={`${summary.listingId}-${summary.networkId}-${summary.assetId ?? "native"}`}
                className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-muted-foreground/70">
                      {humanizeNetwork(summary.networkId)}
                    </p>
                    <p className="text-xl font-regular text-white">{formatListingPrice(summary)}</p>
                    {summary.listingType !== "sale" && activeRentalByListing.has(summary.listingId) ? (
                      <p className="mt-1 text-xs uppercase tracking-wide text-emerald-300/80">Active</p>
                    ) : null}
                  </div>
                  <Button
                    variant="default"
                    className="gap-2"
                    disabled={loadingKey === summary.listingId}
                    onClick={async () => {
                      try {
                        setLoadingKey(summary.listingId);

                        if (summary.listingType === "rent" || summary.listingType === "usage") {
                          const activeRental = activeRentalByListing.get(summary.listingId);
                          if (activeRental) {
                            const response = await fetch(`/api/agents/${agentId}/rental`, {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ rentalId: activeRental.id }),
                            });
                            const payload = await response.json().catch(() => ({}));
                            if (!response.ok) {
                              throw new Error(payload?.message ?? payload?.error ?? `Cancel failed (${response.status})`);
                            }
                            toast.success("Access revoked", { description: "Rental access was cancelled." });
                            setRentals((prev) => prev.filter((row) => row.id !== activeRental.id));
                            return;
                          }

                          const response = await fetch(`/api/agents/${agentId}/rental`, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              listingId: summary.listingId,
                              idempotencyKey: crypto.randomUUID(),
                              terms: {
                                listingType: summary.listingType,
                                networkId: summary.networkId,
                                assetId: summary.assetId ?? null,
                              },
                            }),
                          });
                          const payload = await response.json().catch(() => ({}));
                          if (!response.ok) {
                            throw new Error(payload?.message ?? payload?.error ?? `Rental failed (${response.status})`);
                          }
                          toast.success("Access activated", {
                            description: summary.listingType === "rent" ? "Rental is active." : "Usage access is active.",
                          });
                          if (payload?.rental?.id && payload?.rental?.listing_id) {
                            setRentals((prev) => [
                              {
                                id: String(payload.rental.id),
                                listingId: String(payload.rental.listing_id),
                                state: String(payload.rental.state ?? "active"),
                                startTs: payload.rental.start_ts ?? null,
                                endTs: payload.rental.end_ts ?? null,
                              },
                              ...prev,
                            ]);
                          }
                          return;
                        }

                        const response = await fetch(`/api/agents/${agentId}/copy`, { method: "POST" });
                        const payload = await response.json().catch(() => ({}));
                        if (!response.ok) {
                          throw new Error(payload?.message ?? payload?.error ?? `Copy failed (${response.status})`);
                        }
                        toast.success("Agent copied", { description: "A private copy was created in your workspace." });
                        const nextId = payload?.agent?.id;
                        if (typeof nextId === "string" && nextId.trim()) {
                          router.push(`/agents/${nextId}`);
                        }
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Unable to complete purchase.";
                        toast.error(message);
                      } finally {
                        setLoadingKey(null);
                      }
                    }}
                    aria-label={`Initiate ${humanizeListingType(group.type)} flow for ${humanizeNetwork(summary.networkId)}`}
                  >
                    {summary.listingType === "sale"
                      ? "Copy agent"
                      : activeRentalByListing.has(summary.listingId)
                        ? "Cancel"
                        : "Activate"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function groupListings(listings: AgentListingSummary[]): ListingGroup[] {
  const map = new Map<AgentListingSummary["listingType"], AgentListingSummary[]>();
  for (const summary of listings) {
    const list = map.get(summary.listingType) ?? [];
    list.push(summary);
    map.set(summary.listingType, list);
  }
  return TAB_ORDER
    .filter((type) => map.has(type))
    .map((type) => ({ type, summaries: (map.get(type) ?? []).sort((a, b) => a.networkId.localeCompare(b.networkId)) }));
}
