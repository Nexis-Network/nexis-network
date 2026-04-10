"use client";

import type { NativeIdeWorkbenchTab } from "@/components/artifacts/native-ide-workbench.utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code2Icon,
  FolderTreeIcon,
  GlobeIcon,
  TerminalSquareIcon,
  TestTube2Icon,
} from "lucide-react";

type MobileIdeWorkbenchTabsProps = {
  isTabAvailable: (tab: NativeIdeWorkbenchTab) => boolean;
  viewport: "phone" | "tablet";
};

const TAB_CONFIG: Array<{
  value: NativeIdeWorkbenchTab;
  label: string;
  icon: typeof FolderTreeIcon;
}> = [
  { value: "files", label: "Files", icon: FolderTreeIcon },
  { value: "code", label: "Code", icon: Code2Icon },
  { value: "preview", label: "Preview", icon: GlobeIcon },
  { value: "terminal", label: "Terminal", icon: TerminalSquareIcon },
  { value: "tests", label: "Tests", icon: TestTube2Icon },
];

export function MobileIdeWorkbenchTabs({
  isTabAvailable,
  viewport,
}: MobileIdeWorkbenchTabsProps) {
  return (
    <TabsList className="mt-3 grid w-full grid-cols-5 rounded-[16px] bg-[var(--artifact-surface)] p-1">
      {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
        <TabsTrigger
          key={value}
          value={value}
          disabled={!isTabAvailable(value)}
          className="gap-1 rounded-[12px] px-1 py-2 data-[state=active]:bg-[var(--artifact-panel)] data-[state=active]:text-[var(--artifact-foreground)]"
          data-testid={`artifact-view-switch-${value}`}
        >
          <Icon className="size-4" />
          <span className={viewport === "phone" ? "sr-only" : "text-[11px]"}>
            {label}
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
