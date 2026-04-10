"use client";

import {
  Code2Icon,
  GlobeIcon,
  TerminalSquareIcon,
  TestTube2Icon,
} from "lucide-react";
import {
  workbenchTabListClass,
  workbenchTabTriggerClass,
} from "@/components/artifacts/workbench/workbench-ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NativeIdeWorkbenchTab } from "./native-ide-workbench.utils";

type NativeIdeWorkbenchHeaderProps = {
  activeTab: NativeIdeWorkbenchTab;
  mode: string | null | undefined;
  sandboxId: string | null | undefined;
  title: string | null | undefined;
  onTabChange: (tab: NativeIdeWorkbenchTab) => void;
};

export function NativeIdeWorkbenchHeader({
  activeTab,
  mode,
  sandboxId,
  title,
  onTabChange,
}: NativeIdeWorkbenchHeaderProps) {
  return (
    <div className="border-b border-[var(--artifact-border-strong)] bg-[var(--artifact-toolbar)] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--artifact-muted)]">
            IDE Session
          </div>
          <div className="mt-1 truncate text-sm font-medium text-[var(--artifact-foreground)]">
            {title ?? "Artifact Workbench"}
          </div>
          <div className="mt-1 text-xs text-[var(--artifact-muted)]">
            {mode ?? "code"} {sandboxId ? `• ${sandboxId}` : ""}
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as NativeIdeWorkbenchTab)}
          className="min-w-0"
        >
          <TabsList className={workbenchTabListClass}>
            <TabsTrigger
              value="code"
              className={workbenchTabTriggerClass}
              data-testid="artifact-view-switch-code"
            >
              <Code2Icon className="size-4" />
              Code
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className={workbenchTabTriggerClass}
              data-testid="artifact-view-switch-preview"
            >
              <GlobeIcon className="size-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="terminal"
              className={workbenchTabTriggerClass}
              data-testid="artifact-view-switch-terminal"
            >
              <TerminalSquareIcon className="size-4" />
              Terminal
            </TabsTrigger>
            <TabsTrigger
              value="tests"
              className={workbenchTabTriggerClass}
              data-testid="artifact-view-switch-tests"
            >
              <TestTube2Icon className="size-4" />
              Tests
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
