"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDisk, formatMemory } from "@/lib/cvms";

export type CvmListItem = {
  id: string;
  appId: string | null;
  name: string;
  status: string;
  region: string | null;
  vcpu: number | null;
  memory: number | null;
  diskSize: number | null;
  inProgress: boolean;
  publicUrls: Array<{ app: string; instance: string }>;
};

const statusStyles: Record<string, string> = {
  running: "text-accent-green",
  stopped: "text-text-muted",
  provisioning: "text-accent-sky",
  initializing: "text-accent-sky",
  error: "text-red-400",
};

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "region", label: "Region" },
  { value: "vcpu", label: "vCPU" },
  { value: "memory", label: "Memory" },
  { value: "disk", label: "Disk" },
] as const;

type SortKey = (typeof sortOptions)[number]["value"];

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function getStatusClass(status: string) {
  return statusStyles[normalizeStatus(status)] ?? "text-text-secondary";
}

function compareValues(a: number | string | null, b: number | string | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return b - a;
  return String(a).localeCompare(String(b));
}

export function InstancesTable({ items }: { items: CvmListItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const statusOptions = useMemo(() => {
    const values = new Set(items.map((item) => normalizeStatus(item.status)));
    return ["all", ...Array.from(values).filter(Boolean)];
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.appId ?? "").toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" || normalizeStatus(item.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "status":
          return compareValues(a.status, b.status);
        case "region":
          return compareValues(a.region, b.region);
        case "vcpu":
          return compareValues(a.vcpu, b.vcpu);
        case "memory":
          return compareValues(a.memory, b.memory);
        case "disk":
          return compareValues(a.diskSize, b.diskSize);
        case "name":
        default:
          return compareValues(a.name, b.name);
      }
    });
  }, [filtered, sortKey]);

  if (items.length === 0) {
    return <div className="text-sm text-text-secondary">No CVMs found for this workspace.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="instances-search" className="sr-only">
          Search instances
        </label>
        <Input
          id="instances-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or app id"
          className="w-full md:w-72"
          aria-label="Search instances by name or app ID"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
          aria-label="Filter by status"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="h-10 rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
          aria-label="Sort instances"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Sort by {option.label}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-text-muted">{sorted.length} CVMs</div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-sm text-text-secondary">No CVMs match the current filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr className="border-b border-border-default">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Region</th>
                <th className="py-3 pr-4">vCPU</th>
                <th className="py-3 pr-4">Memory</th>
                <th className="py-3 pr-4">Disk</th>
                <th className="py-3 pr-4">Endpoint</th>
                <th className="py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((cvm) => (
                <tr key={cvm.id} className="border-b border-border-default/60">
                  <td className="py-3 pr-4 text-white font-medium">{cvm.name}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("capitalize", getStatusClass(cvm.status))}>
                        {cvm.status || "unknown"}
                      </span>
                      {cvm.inProgress && <span className="text-xs text-text-muted">(updating)</span>}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">{cvm.region || "—"}</td>
                  <td className="py-3 pr-4 text-text-secondary">{cvm.vcpu ?? "—"}</td>
                  <td className="py-3 pr-4 text-text-secondary">{formatMemory(cvm.memory)}</td>
                  <td className="py-3 pr-4 text-text-secondary">{formatDisk(cvm.diskSize)}</td>
                  <td className="py-3 pr-4 text-text-secondary">
                    {cvm.publicUrls.length > 0 ? (
                      <a
                        className="text-accent-sky hover:text-accent-cyan"
                        href={cvm.publicUrls[0].app}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {cvm.publicUrls[0].app}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 text-text-secondary">
                    {cvm.appId ? (
                      <Link
                        className="text-accent-sky hover:text-accent-cyan"
                        href={`/dashboard/instances/${cvm.appId}`}
                      >
                        View
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
