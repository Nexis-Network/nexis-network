"use client";

import dynamic from "next/dynamic";
import type { CvmListItem } from "./instances-table";

const InstancesTable = dynamic(
  () => import("./instances-table").then((mod) => mod.InstancesTable),
  {
    ssr: false,
    loading: () => <div className="text-sm text-text-secondary">Loading instances…</div>,
  },
);

export function InstancesTableWrapper({ items }: { items: CvmListItem[] }) {
  return <InstancesTable items={items} />;
}
