"use server";

import { createHash } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { revalidatePath } from "next/cache";

import { analyzeDocument } from "@/lib/analyze";
import type { Database, DocumentType } from "@/lib/db/types";
import { processDocument } from "@/lib/extract";
import { openai } from "@/server/services/ai-sdk/openai";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";


import { logger } from '@/lib/logger';
type SupabaseTypedClient = SupabaseClient<Database>;

const MAX_RESULTS = 10;
const EMBEDDING_TIMEOUT_MS = 10_000;
const FULL_TEXT_WEIGHT = 1.0;
const SEMANTIC_WEIGHT = 1.0;
const RRF_K = 50;

const KNOWLEDGE_BASE_PATHS = ["/", "/settings/knowledge-base", "/settings"];

export type DocumentSearchMatch =
  Database["public"]["Functions"]["hybrid_search_documents"]["Returns"][number];

type SearchDocumentChunksResult =
  | { success: true; matches: DocumentSearchMatch[] }
  | { success: false; error: string };

type UploadDocumentResult =
  | {
      success: true;
      document: Database["public"]["Tables"]["doc_processor_documents"]["Row"];
      tasks: Database["public"]["Tables"]["doc_processor_processing_tasks"]["Row"][];
    }
  | {
      success: false;
      error: string;
    };

function revalidateKnowledgeBasePaths() {
  for (const path of KNOWLEDGE_BASE_PATHS) {
    revalidatePath(path);
  }
}

function inferDocumentType(fileName: string): DocumentType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "txt":
      return "txt";
    default:
      return null;
  }
}

async function getTypedSupabaseClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  return supabase as SupabaseTypedClient;
}

async function getAuthenticatedClient() {
  const supabase = await getTypedSupabaseClient();
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error("You must be signed in to manage documents");
    }

    return { supabase, user };
  } catch (error) {
    if (error instanceof Error && error.message.includes("signed in")) {
      throw error;
    }

    logger.error("[KnowledgeBase] Supabase auth getUser failed", error);
    throw new Error("Failed to contact Supabase. Please try again later.");
  }
}

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "No file provided" };
    }

    const documentType = inferDocumentType(file.name);
    if (!documentType) {
      return { success: false, error: "Unsupported file type. Supported types: PDF, DOCX, TXT." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileHash = createHash("sha256").update(buffer).digest("hex");

    const { data: existingDoc, error: duplicateCheckError } = await supabase
      .from("doc_processor_documents")
      .select("id")
      .eq("user_id", user.id)
      .eq("file_hash", fileHash)
      .maybeSingle();

    if (duplicateCheckError && duplicateCheckError.code !== "PGRST116") {
      // PGRST116 => row not found in maybeSingle
      throw duplicateCheckError;
    }

    if (existingDoc) {
      return { success: false, error: "This document has already been uploaded." };
    }

    const filePath = `${user.id}/${fileHash}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: document, error: insertError } = await supabase
      .from("doc_processor_documents")
      .insert({
        title: file.name,
        file_path: filePath,
        file_type: documentType,
        file_size: file.size,
        mime_type: file.type,
        user_id: user.id,
        file_hash: fileHash,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const { data: task, error: taskError } = await supabase
      .from("doc_processor_processing_tasks")
      .insert({
        document_id: document.id,
        task_type: "extract",
        status: "pending",
      })
      .select()
      .single();

    if (taskError) {
      throw taskError;
    }

    revalidateKnowledgeBasePaths();

    return {
      success: true,
      document,
      tasks: task ? [task] : [],
    };
  } catch (error) {
    logger.error("[uploadDocument] error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

export async function startExtraction(documentId: string) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const { data: document, error: docError } = await supabase
      .from("doc_processor_documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError) {
      throw docError;
    }

    if (!document) {
      return { success: false as const, error: "Document not found" };
    }

    await processDocument(supabase, documentId, user.id);
    revalidateKnowledgeBasePaths();

    return { success: true as const };
  } catch (error) {
    logger.error("[startExtraction] error", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Extraction failed",
    };
  }
}

export async function startAnalysis(documentId: string) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const { data: document, error: docError } = await supabase
      .from("doc_processor_documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError) {
      throw docError;
    }

    if (!document) {
      return { success: false as const, error: "Document not found" };
    }

    await analyzeDocument(supabase, documentId, user.id);
    revalidateKnowledgeBasePaths();

    return { success: true as const };
  } catch (error) {
    logger.error("[startAnalysis] error", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

type DocumentRow = Database["public"]["Tables"]["doc_processor_documents"]["Row"];

export type DocumentWithDetails = DocumentRow & {
  doc_processor_document_chunks?: Database["public"]["Tables"]["doc_processor_document_chunks"]["Row"][] | null;
  doc_processor_document_entities?: Database["public"]["Tables"]["doc_processor_document_entities"]["Row"][] | null;
};

type GetDocumentsOptions = {
  includeDetails?: boolean;
};

const DOCUMENT_DETAILS_SELECT =
  "*, doc_processor_document_chunks(*), doc_processor_document_entities(*)" as const;

function normalizeSupabaseError(context: string, error: UntypedJson): Error {
  if (error instanceof Error) {
    return new Error(`${context}: ${error.message}`, { cause: error });
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = `${context}: ${String((error as { message: UntypedJson }).message)}`;
    return new Error(message, { cause: error as object });
  }

  return new Error(context);
}

export async function getDocuments(): Promise<DocumentRow[]>;
export async function getDocuments(options: { includeDetails: true }): Promise<DocumentWithDetails[]>;
export async function getDocuments(options?: GetDocumentsOptions): Promise<DocumentRow[] | DocumentWithDetails[]> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (options?.includeDetails) {
      const { data, error } = await supabase
        .from("doc_processor_documents")
        .select(DOCUMENT_DETAILS_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw normalizeSupabaseError("Failed to load documents", error);
      }

      return (data ?? []) as DocumentWithDetails[];
    }

    const { data, error } = await supabase
      .from("doc_processor_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw normalizeSupabaseError("Failed to load documents", error);
    }

    return (data ?? []) as DocumentRow[];
  } catch (error) {
    throw normalizeSupabaseError("Failed to load documents", error);
  }
}

export async function getDocumentStatus(
  documentId: string,
): Promise<
  | {
      success: true;
      document: Database["public"]["Tables"]["doc_processor_documents"]["Row"];
      tasks: Database["public"]["Tables"]["doc_processor_processing_tasks"]["Row"][];
    }
  | { success: false; error: string }
> {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    const { data: document, error: documentError } = await supabase
      .from("doc_processor_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (documentError) {
      throw documentError;
    }

    if (!document) {
      return { success: false as const, error: "Document not found" };
    }

    const { data: tasks, error: tasksError } = await supabase
      .from("doc_processor_processing_tasks")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (tasksError) {
      throw tasksError;
    }

    return {
      success: true as const,
      document,
      tasks: tasks ?? [],
    };
  } catch (error) {
    logger.error("[getDocumentStatus] error", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch document status",
    };
  }
}

export async function searchDocumentChunks(
  query: string,
  documentId?: string,
): Promise<SearchDocumentChunksResult> {
  try {
    if (!query.trim()) {
      return { success: true, matches: [] };
    }

    const { supabase } = await getAuthenticatedClient();

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
      maxRetries: 3,
      abortSignal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
    });

    if (!embedding) {
      throw new Error("Failed to generate embedding for query");
    }

    const rpcParams = {
      query_text: query,
      query_embedding: Array.from(embedding),
      match_count: MAX_RESULTS,
      full_text_weight: FULL_TEXT_WEIGHT,
      semantic_weight: SEMANTIC_WEIGHT,
      rrf_k: RRF_K,
    };

    const { data, error } = await supabase.rpc("hybrid_search_documents", rpcParams);

    if (error) {
      throw error;
    }

    const matches: DocumentSearchMatch[] = (data ?? []).filter((match) => {
      if (!documentId) return true;
      return match.document_id === documentId;
    });

    return {
      success: true,
      matches,
    };
  } catch (error) {
    logger.error("[searchDocumentChunks] error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search documents",
    };
  }
}
