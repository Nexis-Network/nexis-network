"use client";

import { useSearchParams } from "next/navigation";

import ArtifactsContent from "@/components/settings/ai/artifacts-content";
import DocumentsContent from "@/components/settings/ai/documents-content";
import KnowledgeBaseContent from "@/components/settings/ai/knowledge-base-content";

export function SettingsArtifactsSection() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view");

  if (activeView === "documents") {
    return <DocumentsContent />;
  }

  if (activeView === "knowledge") {
    return <KnowledgeBaseContent />;
  }

  return <ArtifactsContent />;
}
