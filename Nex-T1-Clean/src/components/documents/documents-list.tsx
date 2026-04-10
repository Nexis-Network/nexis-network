import { getDocuments, type DocumentWithDetails } from "@/lib/document-processor/actions";
import { DocumentCard } from "./document-card";


import { logger } from '@/lib/logger';
export async function DocumentsList() {
  try {
    const documents = (await getDocuments({ includeDetails: true })) as DocumentWithDetails[];

    if (documents.length === 0) {
      return (
        <div className="space-y-4 pr-4">
          <h2 className="pl-1 font-regular text-muted-foreground text-xs">Recent Documents</h2>
          <div className="rounded-xl border border-dashed border-border p-6 text-muted-foreground text-sm">
            No documents uploaded yet. Drag and drop a document to get started.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 pr-4">
        <h2 className="pl-1 font-regular text-muted-foreground text-xs">Recent Documents</h2>
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            chunks={document.doc_processor_document_chunks ?? []}
            entities={document.doc_processor_document_entities ?? []}
          />
        ))}
      </div>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase is not configured") {
      return (
        <div className="rounded-xl border border-dashed border-border p-6 text-muted-foreground text-sm">
          Supabase environment variables are not configured.
        </div>
      );
    }

    if (error instanceof Error && error.message === "You must be signed in to manage documents") {
      return (
        <div className="rounded-xl border border-border p-6 text-muted-foreground text-sm">
          Sign in to upload and view your knowledge base documents.
        </div>
      );
    }

      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error ?? {});
      logger.error("[DocumentsList] fetch error", message);
      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-destructive text-sm">
          Failed to load documents. {message}
        </div>
      );
  }
}
