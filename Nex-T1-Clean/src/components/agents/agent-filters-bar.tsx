"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

import { cn } from "@/lib/utils";
import { AgentListingType } from "@/lib/agents/types";
import type { AgentFilterState, FilterOption } from "@/lib/agents/filters";
import { DEFAULT_AGENT_FILTER_STATE } from "@/lib/agents/filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AgentFiltersBarProps = {
  value: AgentFilterState;
  networkOptions: FilterOption[];
  assetOptions: FilterOption[];
  className?: string;
};

const LISTING_TYPE_OPTIONS: FilterOption[] = [
  { value: "sale", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "usage", label: "Usage" },
];

export function AgentFiltersBar({
  value,
  networkOptions,
  assetOptions,
  className,
}: AgentFiltersBarProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<AgentFilterState>(value ?? DEFAULT_AGENT_FILTER_STATE);

  useEffect(() => {
    setFilters(value ?? DEFAULT_AGENT_FILTER_STATE);
  }, [value]);

  const applyFilters = useCallback(
    (next: AgentFilterState) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (next.query.trim()) {
        params.set("q", next.query.trim());
      } else {
        params.delete("q");
      }

      if (next.listingTypes.length > 0) {
        params.set("listingTypes", next.listingTypes.join(","));
      } else {
        params.delete("listingTypes");
      }

      if (next.networks.length > 0) {
        params.set("networks", next.networks.join(","));
      } else {
        params.delete("networks");
      }

      if (next.assets.length > 0) {
        params.set("assets", next.assets.join(","));
      } else {
        params.delete("assets");
      }

      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname ?? ''}?${queryString}` : (pathname ?? ''), {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const scheduleApply = useCallback(
    (next: AgentFilterState) => {
      Promise.resolve().then(() => applyFilters(next));
    },
    [applyFilters],
  );

  const debouncedApply = useDebouncedCallback(applyFilters, 280);

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      setFilters((prev) => {
        const next = { ...prev, query: nextQuery };
        debouncedApply(next);
        return next;
      });
    },
    [debouncedApply],
  );

  const toggleListingType = useCallback(
    (type: AgentListingType) => {
      setFilters((prev) => {
        const exists = prev.listingTypes.includes(type);
        const nextTypes = exists
          ? prev.listingTypes.filter((entry) => entry !== type)
          : [...prev.listingTypes, type];
        const next = { ...prev, listingTypes: nextTypes };
        scheduleApply(next);
        return next;
      });
    },
    [scheduleApply],
  );

  const toggleNetwork = useCallback(
    (value: string) => {
      setFilters((prev) => {
        const exists = prev.networks.includes(value);
        const nextNetworks = exists
          ? prev.networks.filter((entry) => entry !== value)
          : [...prev.networks, value];
        const next = { ...prev, networks: nextNetworks };
        scheduleApply(next);
        return next;
      });
    },
    [scheduleApply],
  );

  const toggleAsset = useCallback(
    (value: string) => {
      setFilters((prev) => {
        const exists = prev.assets.includes(value);
        const nextAssets = exists
          ? prev.assets.filter((entry) => entry !== value)
          : [...prev.assets, value];
        const next = { ...prev, assets: nextAssets };
        scheduleApply(next);
        return next;
      });
    },
    [scheduleApply],
  );

  const listingTypeSelection = useMemo(() => new Set(filters.listingTypes), [filters.listingTypes]);
  const networkSelection = useMemo(() => new Set(filters.networks), [filters.networks]);
  const assetSelection = useMemo(() => new Set(filters.assets), [filters.assets]);

  return (
    <div
      className={cn(
        "rounded-[20px] border border-[var(--settings-border-soft)] bg-[rgba(15,15,16,0.72)] px-4 py-4 shadow-[0_24px_50px_-42px_rgba(0,0,0,0.95)] backdrop-blur-md",
        "sm:px-6 sm:py-4",
        className,
      )}
      aria-label="Agent marketplace filters"
    >
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-2.5 h-4 w-4 text-[var(--settings-foreground-muted)]"
              aria-hidden="true"
            />
            <Input
              type="search"
              inputMode="search"
              placeholder="Search agents by name, capability, or owner…"
              className="border-[var(--settings-border)]/8 bg-[var(--settings-surface)] pl-9 pr-4 text-sm text-[var(--settings-foreground-strong)] placeholder:text-[var(--settings-foreground-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
              value={filters.query}
              onChange={(event) => handleQueryChange(event.target.value)}
              aria-label="Search agents"
            />
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "inline-flex w-fit items-center gap-2 self-start rounded-full border border-[var(--settings-border-soft)] bg-white/[0.04] px-3 py-1 text-xs font-medium text-[var(--settings-foreground-muted)] sm:self-auto",
              isPending && "animate-pulse text-[var(--settings-foreground-strong)]",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {isPending ? "Updating…" : "Filters active"}
          </Badge>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterGroupLabel>Listing type</FilterGroupLabel>
            {LISTING_TYPE_OPTIONS.map((option) => {
              const active = listingTypeSelection.has(option.value as AgentListingType);
              return (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={active}
                  onClick={() => toggleListingType(option.value as AgentListingType)}
                />
              );
            })}
          </div>

          {networkOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <FilterGroupLabel>Network</FilterGroupLabel>
              {networkOptions.map((option) => {
                const active = networkSelection.has(option.value);
                return (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    badge={option.badge}
                    active={active}
                    onClick={() => toggleNetwork(option.value)}
                  />
                );
              })}
            </div>
          ) : null}

          {assetOptions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <FilterGroupLabel>Asset</FilterGroupLabel>
              {assetOptions.map((option) => {
                const active = assetSelection.has(option.value);
                return (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    badge={option.badge}
                    active={active}
                    onClick={() => toggleAsset(option.value)}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterGroupLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--settings-foreground-subtle)]">
      {children}
    </span>
  );
}

type FilterChipProps = {
  label: string;
  badge?: string;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ label, badge, active, onClick }: FilterChipProps) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "relative h-9 rounded-full border border-[var(--settings-border-soft)] bg-white/[0.04] px-4 text-xs font-medium text-[var(--settings-foreground-muted)] transition hover:border-[var(--settings-border)]/8 hover:text-[var(--settings-foreground-strong)]",
        active && "border-white/30 bg-white text-[#0f0f10] shadow-[0_12px_30px_-22px_rgba(255,255,255,0.7)]",
      )}
      aria-pressed={active}
    >
      <span className="flex items-center gap-1.5">
        <span>{label}</span>
        {badge ? (
          <motion.span
            layout
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
              active ? "bg-black/10 text-[#0f0f10]" : "bg-white/[0.05] text-[var(--settings-foreground-subtle)]",
            )}
          >
            {badge}
          </motion.span>
        ) : null}
      </span>
      {active ? (
        <motion.span
          layoutId={`filter-active-${label}`}
          className="absolute inset-0 rounded-full border border-black/10"
          aria-hidden="true"
        />
      ) : null}
    </Button>
  );
}
