import { Suspense } from "react";

import { DocumentSearch } from "@/components/documents/document-search";
import { DocumentsList } from "@/components/documents/documents-list";
import { UploadZoneWrapper } from "@/components/shared/uploads/upload-zone";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { Skeleton } from "@/components/ui/skeleton";

export default async function KnowledgeBasePage() {
  return (
    <SettingsPage className="py-2">
      <SettingsPageHeader
        title="Document Processor Pipeline"
        description="Upload documents to Supabase, parse them into chunked vector embeddings, and power semantic search across your knowledge base."
        badge={<p className="text-sm text-[var(--settings-foreground-subtle)]">Vector Embedding</p>}
      />
      <UploadZoneWrapper />

      <div className="space-y-4">
        <DocumentSearch />

        <Suspense
          fallback={
            <div className="space-y-4">
              <p className="animate-pulse text-[var(--bento-text-muted)] text-sm">Loading Documents...</p>
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="h-24 rounded-3xl" />
            </div>
          }
        >
          <DocumentsList />
        </Suspense>
      </div>
    </SettingsPage>
  );
}
