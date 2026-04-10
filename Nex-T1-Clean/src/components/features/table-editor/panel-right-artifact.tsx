"use client";

import { ChevronsLeft, MessageCircle, PanelRightOpen, X } from "lucide-react";
import type { ExpandablePanelState } from "@/components/layout/panels/expandable-panel";
import type { UseMessageArtifactReturn } from "@/lib/ai/use-message-artifact";
import { ExpandablePanel } from "@/components/layout/panels/expandable-panel";
import { defaultCollaborations, IntroHeading } from "@/components/shared/branding/intro-heading";
import { TableArtifact } from "./table-artifact";
import { TableArtifactLoading } from "./table-artifact-loading";

type PanelRightArtifactProps = {
  leftPanelState: ExpandablePanelState;
  rightPanelState: ExpandablePanelState;
  artifact: UseMessageArtifactReturn<UntypedJson> | null | undefined;
};

export function PanelRightArtifact({ leftPanelState, rightPanelState, artifact }: PanelRightArtifactProps) {
  const { isCollapsed: leftCollapsed, collapse: collapseLeft, expand: expandLeft } = leftPanelState;

  const { collapse, panelProps } = rightPanelState;

  // Derive artifact state
  const hasArtifactData = Boolean(artifact?.hasData && artifact?.data);
  const shouldShowLoading = Boolean(
    artifact?.isActive &&
      (artifact?.data as { stage?: string })?.stage &&
      (artifact?.data as { stage?: string })?.stage !== "complete"
  );

  return (
    <ExpandablePanel
      {...panelProps}
      collapseButtonLabel="Collapse panel"
      collapsedLabel={<PanelRightOpen className="h-4 w-4" />}
      header={
        <div className="flex items-center justify-between border-border border-b p-4">
          <button
            className="rounded-lg bg-secondary px-3 py-2 text-secondary-foreground text-sm transition-colors hover:bg-secondary/80"
            onClick={leftCollapsed ? expandLeft : collapseLeft}
            type="button"
          >
            {leftCollapsed ? (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Chat</span>
              </div>
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <IntroHeading
              collaborations={defaultCollaborations}
              subtitle={"CSV Table Artifact"}
              title={(artifact?.data as { title?: string })?.title ?? ""}
            />
          </div>
          <button
            aria-label="Close right panel"
            className="rounded-lg bg-secondary px-3 py-2 text-secondary-foreground text-sm transition-colors hover:bg-secondary/80"
            onClick={() => collapse()}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      }
      panelClassName="ml-2 my-2 rounded-lg border border-border"
    >
      {(() => {
        if (shouldShowLoading) {
          return <TableArtifactLoading showDetails={true} showTableSkeleton={true} />;
        }
        if (hasArtifactData) {
          return <TableArtifact />;
        }
        return (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground text-sm">
            Send a prompt with CSV data or instructions to generate the table editor artifact.
          </div>
        );
      })()}
    </ExpandablePanel>
  );
}
