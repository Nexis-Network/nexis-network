import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageSquareText, TerminalSquare } from "lucide-react";

import { MarketTerminalArtifactSurface } from "@/components/artifacts/features/market/market-terminal-artifact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeIdeWorkbench } from "@/components/artifacts/native-ide-workbench";
import { WorkflowCanvas } from "@/components/ai-elements/workflow-canvas";
import { MarketTerminalArtifactSchema } from "@/modules/shared/artifacts/market-terminal";
import { createClient } from "@/server/services/supabase/server";
import { loadUserArtifactDetail } from "@/server/services/artifacts/user-artifacts";
import type {
  NativeIdeSessionData,
  NativeWorkflowCanvasData,
} from "@/modules/chat/ui-message-parts";

type ArtifactDetailPageProps = {
  params: Promise<{ artifactId: string }>;
};

function formatDateTime(value: string) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Unknown";
  return dt.toLocaleString();
}

function safeJson(value: UntypedJson) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asNativeIdeSnapshot(value: UntypedJson): NativeIdeSessionData | null {
  if (!isRecord(value) || !Array.isArray(value.files)) {
    return null;
  }

  return value as unknown as NativeIdeSessionData;
}

function asNativeWorkflowSnapshot(value: UntypedJson): NativeWorkflowCanvasData | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null;
  }

  return value as unknown as NativeWorkflowCanvasData;
}

export default async function ArtifactDetailPage({ params }: ArtifactDetailPageProps) {
  const { artifactId: rawArtifactId } = await params;
  const artifactId = decodeURIComponent(rawArtifactId);

  const supabase = await createClient();
  if (!supabase) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const artifact = await loadUserArtifactDetail(user.id, artifactId);
  if (!artifact) {
    notFound();
  }

  const ideSnapshot = asNativeIdeSnapshot(artifact.snapshot);
  const workflowSnapshot = asNativeWorkflowSnapshot(artifact.snapshot);
  const marketTerminalSnapshot =
    artifact.artifactType === "market-terminal"
      ? MarketTerminalArtifactSchema.safeParse(artifact.snapshot)
      : null;

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/settings/artifacts">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Artifacts
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {artifact.conversationId ? (
            <Button variant="outline" asChild>
              <Link href={`/app?session=${encodeURIComponent(artifact.conversationId)}`}>
                <MessageSquareText className="mr-1.5 h-4 w-4" />
                Open Session
              </Link>
            </Button>
          ) : null}
          {artifact.previewUrl ? (
            <Button variant="outline" asChild>
              <a href={artifact.previewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Open Preview
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-background/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-lg font-medium">{artifact.title ?? artifact.artifactId}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="uppercase">
            {artifact.artifactType}
          </Badge>
          <span>Created {formatDateTime(artifact.createdAt)}</span>
          <span>Updated {formatDateTime(artifact.updatedAt)}</span>
          {artifact.sandboxId ? <Badge variant="outline">Sandbox {artifact.sandboxId}</Badge> : null}
          {artifact.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-background/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Snapshot</h2>
        {ideSnapshot ? (
          <div className="mb-4">
            <NativeIdeWorkbench session={ideSnapshot} />
          </div>
        ) : null}
        {workflowSnapshot ? (
          <div className="mb-4">
            <WorkflowCanvas
              title={workflowSnapshot.title}
              nodes={workflowSnapshot.nodes}
              edges={workflowSnapshot.edges}
            />
          </div>
        ) : null}
        {marketTerminalSnapshot?.success ? (
          <div className="mb-4 h-[760px] overflow-hidden rounded-xl border border-border/60 bg-black/20">
            <MarketTerminalArtifactSurface
              artifactData={marketTerminalSnapshot.data}
              chatActionsEnabled={Boolean(artifact.conversationId)}
            />
          </div>
        ) : null}
        <pre className="max-h-[560px] overflow-auto rounded-md border border-border/70 bg-black/30 p-3 text-xs text-foreground">
          {safeJson(artifact.snapshot)}
        </pre>
      </div>

      <div className="rounded-xl border border-border/70 bg-background/60 p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Metadata</h2>
        <pre className="max-h-[320px] overflow-auto rounded-md border border-border/70 bg-black/30 p-3 text-xs text-foreground">
          {safeJson(artifact.metadata)}
        </pre>
      </div>
    </section>
  );
}
