/**
 * Document Upload API
 * Handles PDF/text document uploads, chunking, and embedding generation
 */

import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { processDocument } from "@/lib/vectorize";
import {
  isFileScanEnabled,
} from "@/server/services/superagent/config";
import { guardFile } from "@/server/services/superagent/guard";
import { recordSecurityEvent } from "@/modules/security/audit-logger";


import { logger } from '@/lib/logger';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/markdown"];

function inferDocumentType(mimeType: string): "pdf" | "txt" | null {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "text/plain":
    case "text/markdown":
      return "txt";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    if (!supabase) {
      return apiResponse.serviceUnavailable("Database unavailable");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiResponse.unauthorized();
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "general";
    let tags: unknown[] = [];
    if (formData.get("tags")) {
      try {
        const parsed = JSON.parse(formData.get("tags") as string);
        tags = Array.isArray(parsed) ? parsed : [];
      } catch {
        tags = [];
      }
    }

    if (!file) {
      return apiResponse.badRequest("No file provided");
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiResponse.badRequest("Unsupported file type. Allowed: PDF, text, markdown");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return apiResponse.badRequest(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Superagent Guardrails: Scan file for prompt injections and malicious content
    if (isFileScanEnabled()) {
      try {
        // Read file content for scanning (text-based files only)
        const isTextBased = file.type === "text/plain" || file.type === "text/markdown";
        
        if (isTextBased) {
          const fileContent = await file.text();
          const scanResult = await guardFile(fileContent, file.name, file.type, {
            userId: user.id,
          });

          if (scanResult.violations.length > 0) {
            await recordSecurityEvent({
              type: scanResult.blocked ? "file_rejected" : "guard_violation",
              action: scanResult.blocked ? "blocked" : "warned",
              severity: scanResult.violations[0]?.severity ?? "medium",
              violations: scanResult.violations,
              userId: user.id,
              reasoning: scanResult.reasoning,
              metadata: {
                filename: file.name,
                mimeType: file.type,
                fileSize: file.size,
              },
            });
          }

          if (scanResult.blocked) {
            return apiResponse.error(
              "SECURITY_VIOLATION",
              "File upload rejected due to security concerns",
              422,
              {
                violations: scanResult.violations.map((v) => ({
                  type: v.type,
                  severity: v.severity,
                  message: v.message,
                })),
              }
            );
          }
        }
        
        // For PDF files, we can optionally extract and scan text content
        // This would require a PDF parsing library - skipping for now but logging
        if (file.type === "application/pdf") {
          logger.debug(`[Document Upload] PDF file "${file.name}" uploaded - full content scan requires PDF extraction`);
        }
      } catch (scanError) {
        // Log scan errors but don't block (fail open)
        logger.error("[Document Upload] Security scan failed:", scanError);
      }
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${user.id}/${fileName}`;
    const documentType = inferDocumentType(file.type);

    if (!documentType) {
      return apiResponse.badRequest("Unsupported file type. Allowed: PDF, text, markdown");
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error("[Document Upload] Storage error:", uploadError);
      return apiResponse.internalError("Upload failed");
    }

    // Get file hash for deduplication
    const fileBuffer = await file.arrayBuffer();
    const hashArray = await crypto.subtle.digest("SHA-256", fileBuffer);
    const fileHash = Array.from(new Uint8Array(hashArray))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("doc_processor_documents")
      .insert({
        user_id: user.id,
        title: file.name,
        file_path: uploadData.path,
        file_type: documentType,
        file_size: file.size,
        mime_type: file.type,
        file_hash: fileHash,
        status: "pending",
        category,
        tags,
        source_type: "upload",
      })
      .select("id")
      .single();

    if (docError) {
      logger.error("[Document Upload] Database error:", docError);

      // Clean up uploaded file
      await supabase.storage.from("documents").remove([filePath]);

      return apiResponse.internalError("Failed to create document record");
    }

    // Upload persistence is currently Supabase-only.
    const ipfsCid: string | undefined = undefined;
    const ipfsGatewayUrl: string | undefined = undefined;

    // Trigger background processing (chunking + embedding)
    // This runs asynchronously
    processDocument(supabase, document.id, user.id).catch((error) => {
      logger.error("[Document Upload] Processing failed:", error);
    });

    return apiResponse.success({
      success: true,
      documentId: document.id,
      fileName: file.name,
      fileSize: file.size,
      status: "processing",
      ipfsCid,
      ipfsGatewayUrl,
    });
  } catch (error) {
    logger.error("[Document Upload] Error:", error);
    return apiResponse.internalError("Upload failed");
  }
}

/**
 * GET handler - List user's documents
 */
export async function GET() {
  try {
    const supabase = await createClient();

    if (!supabase) {
    /* ... This chunk targets lines 237-264 ... */
    // Since multi-replace handles disparate chunks, I'll resume at GET handler parts
    // Wait, I need to restart chunks here because previous chunk was large. Let's start a new chunk for GET/DELETE
    return apiResponse.serviceUnavailable("Database unavailable");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiResponse.unauthorized();
    }

    const { data: documents, error } = await supabase
      .from("doc_processor_documents")
      .select("id, title, file_type, file_size, status, category, tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return apiResponse.internalError("Failed to list documents");
    }

    return apiResponse.success({ documents });
  } catch (error) {
    logger.error("[Document List] Error:", error);
    return apiResponse.internalError("Failed to list documents");
  }
}

/**
 * DELETE handler - Remove document
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    if (!supabase) {
      return apiResponse.serviceUnavailable("Database unavailable");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiResponse.unauthorized();
    }

    const url = new URL(req.url);
    const documentId = url.searchParams.get("id");

    if (!documentId) {
      return apiResponse.badRequest("Document ID required");
    }

    // Get document to find storage path
    const { data: document } = await supabase
      .from("doc_processor_documents")
      .select("file_path")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (!document) {
      return apiResponse.notFound("Document not found");
    }

    // Delete from storage
    if (document.file_path) {
      await supabase.storage.from("documents").remove([document.file_path]);
    }

    // Delete from database (cascades to chunks and embeddings)
    const { error: deleteError } = await supabase
      .from("doc_processor_documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (deleteError) {
      return apiResponse.internalError("Failed to delete document");
    }

    return apiResponse.success({ success: true });
  } catch (error) {
    logger.error("[Document Delete] Error:", error);
    return apiResponse.internalError("Failed to delete document");
  }
}
