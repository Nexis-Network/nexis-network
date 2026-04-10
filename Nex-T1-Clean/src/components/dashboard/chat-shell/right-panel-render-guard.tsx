"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/logger";
import type { AIEvent } from "@/lib/schema";
import type {
  NativeIdeSessionData,
  NativeWorkflowCanvasData,
} from "@/modules/chat/ui-message-parts";

type RightPanelRenderGuardProps = {
  children: ReactNode;
  resetKey?: string;
};

type RightPanelRenderGuardState = {
  hasError: boolean;
};

export function resolveRightPanelRenderResetKey(args: {
  activeEvent?: AIEvent | null;
  activeTool?: UntypedJson | null;
  artifactType?: string | null;
  ideSession?: NativeIdeSessionData | null;
  openedDocumentId?: string | null;
  workflowCanvas?: NativeWorkflowCanvasData | null;
}): string {
  if (args.openedDocumentId) return `document:${args.openedDocumentId}`;

  const ideKey =
    args.ideSession?.artifactId ??
    args.ideSession?.sandboxId ??
    args.ideSession?.title;
  if (ideKey) return `ide:${ideKey}`;

  const workflowKey =
    args.workflowCanvas?.artifactId ?? args.workflowCanvas?.title;
  if (workflowKey) return `workflow:${workflowKey}`;

  if (
    args.activeTool &&
    typeof args.activeTool === "object" &&
    typeof (args.activeTool as { toolName?: unknown }).toolName === "string"
  ) {
    return `tool:${(args.activeTool as { toolName: string }).toolName}`;
  }

  if (args.activeEvent?.type) return `event:${args.activeEvent.type}`;
  if (args.artifactType) return `artifact:${args.artifactType}`;
  return "panel:default";
}

export class RightPanelRenderGuard extends Component<
  RightPanelRenderGuardProps,
  RightPanelRenderGuardState
> {
  public state: RightPanelRenderGuardState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): RightPanelRenderGuardState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error("Right panel render error", {
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  public componentDidUpdate(
    prevProps: Readonly<RightPanelRenderGuardProps>,
  ): void {
    if (
      this.state.hasError &&
      this.props.resetKey &&
      this.props.resetKey !== prevProps.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return <RightPanelRenderFallback />;
    }

    return this.props.children;
  }
}

function RightPanelRenderFallback(): ReactNode {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center rounded-[30px] border border-[var(--artifact-border)] bg-[var(--artifact-shell)] p-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-2">
        <h2 className="text-base font-semibold text-[var(--artifact-foreground)]">
          Artifact panel unavailable
        </h2>
        <p className="text-sm text-[var(--artifact-muted)]">
          The workbench hit an unexpected rendering error. Close or switch the
          current artifact and try again.
        </p>
      </div>
    </div>
  );
}
