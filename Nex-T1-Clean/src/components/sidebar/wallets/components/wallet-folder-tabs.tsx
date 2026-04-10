"use client";

import { useMemo } from "react";
import { SegmentedTabs, type SegmentedTabOption } from "@/components/ui/tabs";

export type WalletTab = "assets" | "activity" | "protocols" | "approvals";

interface WalletFolderTabsProps {
  leftTab: WalletTab;
  setLeftTab: (tab: WalletTab) => void;
  isEVM: boolean;
}

const BASE_OPTIONS: SegmentedTabOption<WalletTab>[] = [
  { value: "assets", label: "Assets" },
  { value: "activity", label: "Activity" },
];

const EVM_OPTIONS: SegmentedTabOption<WalletTab>[] = [
  { value: "assets", label: "Assets" },
  { value: "activity", label: "Activity" },
  { value: "protocols", label: "Protocols" },
  { value: "approvals", label: "Approvals" },
];

export function WalletFolderTabs({ leftTab, setLeftTab, isEVM }: WalletFolderTabsProps) {
  const options = useMemo(() => (isEVM ? EVM_OPTIONS : BASE_OPTIONS), [isEVM]);

  return (
    <SegmentedTabs
      options={options}
      value={leftTab}
      onChange={setLeftTab}
      size="sm"
    />
  );
}
