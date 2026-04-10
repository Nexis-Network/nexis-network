import type { SupabaseClient } from "@supabase/supabase-js";
import mammoth from "mammoth";

import type { Database } from "@/lib/db/types";

import { logger } from "@/lib/logger";
let pdfjsModule: typeof import("pdfjs-dist") | null = null;

async function ensurePdfjs() {
  if (!pdfjsModule) {
    pdfjsModule = await import("pdfjs-dist");
  }
  return pdfjsModule;
}

type ExtractedContent = {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
  };
};

export async function processDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  userId: string,
) {
  const startTime = Date.now();
  try {
    logger.debug(`[Extract] Starting extraction for document ${documentId}`);

    // Get document
    const { data: document, error: docError } = await supabase
      .from("doc_processor_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      logger.error("[Extract] Document fetch error:", docError);
      throw docError || new Error("Document not found");
    }

    logger.debug(
      `[Extract] Retrieved document: ${document.title} (${document.file_type})`,
      {
        size: document.file_size,
        mimeType: document.mime_type,
      },
    );

    // Create extraction task
    const { data: task, error: taskError } = await supabase
      .from("doc_processor_processing_tasks")
      .insert({
        document_id: documentId,
        task_type: "extract",
        status: "processing",
      })
      .select()
      .single();

    if (taskError) {
      logger.error("[Extract] Task creation error:", taskError);
      throw taskError;
    }

    logger.debug(`[Extract] Created extraction task: ${task.id}`);

    // Download file
    logger.debug(`[Extract] Downloading file from: ${document.file_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      logger.error("[Extract] File download error:", downloadError);
      throw downloadError || new Error("Failed to download file");
    }

    logger.debug(
      `[Extract] File downloaded successfully, size: ${fileData.size} bytes`,
    );

    // Extract content based on file type
    logger.debug(
      `[Extract] Starting content extraction for ${document.file_type} file`,
    );
    let content: ExtractedContent;
    switch (document.file_type) {
      case "pdf":
        content = await extractPdfContent(fileData);
        break;
      case "docx":
        content = await extractDocxContent(fileData);
        break;
      case "txt":
        content = await extractTextContent(fileData);
        break;
      default:
        logger.error(`[Extract] Unsupported file type: ${document.file_type}`);
        throw new Error(`Unsupported file type: ${document.file_type}`);
    }

    logger.debug("[Extract] Content extracted successfully", {
      textLength: content.text.length,
      wordCount: content.metadata.wordCount,
      pageCount: content.metadata.pageCount,
    });

    // Update document with extracted content
    logger.debug("[Extract] Updating document with extracted content...");
    const { error: updateError } = await supabase
      .from("doc_processor_documents")
      .update({
        extracted_text: content.text,
        metadata: content.metadata,
        status: "processing" as const,
      })
      .eq("id", documentId)
      .eq("user_id", userId);

    if (updateError) {
      logger.error("[Extract] Document update error:", updateError);
      throw updateError;
    }

    logger.debug("[Extract] Document updated with extracted content");

    // Update task status
    await supabase
      .from("doc_processor_processing_tasks")
      .update({
        status: "processed" as const,
      })
      .eq("id", task.id);

    logger.debug("[Extract] Extraction task marked as processed");

    // Create and trigger analysis task
    const { error: analysisError } = await supabase
      .from("doc_processor_processing_tasks")
      .insert({
        document_id: documentId,
        task_type: "analyze",
        status: "pending" as const,
      });

    if (analysisError) {
      logger.error("[Extract] Analysis task creation error:", analysisError);
      throw analysisError;
    }

    logger.debug("[Extract] Created analysis task");
    logger.debug(
      `[Extract] Extraction pipeline processed for document ${documentId}`,
    );

    // Trigger analysis pipeline
    // Need to return success to the client here..  then trigger the analyzeDocument from the upload-zone
    // logger.debug("[Extract] Triggering analysis pipeline...");
    // await analyzeDocument(supabase, documentId);
  } catch (error) {
    logger.error("[Extract] Pipeline error:", error);

    // Update document status
    logger.debug("[Extract] Updating document status to error...");
    await supabase
      .from("doc_processor_documents")
      .update({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", documentId)
      .eq("user_id", userId);

    // Update task status if it exists
    const { data: task } = await supabase
      .from("doc_processor_processing_tasks")
      .select("id")
      .eq("document_id", documentId)
      .eq("task_type", "extract")
      .single();

    if (task) {
      logger.debug("[Extract] Updating task status to error...");
      await supabase
        .from("doc_processor_processing_tasks")
        .update({
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", task.id);
    }

    throw error;
  } finally {
    const duration = Date.now() - startTime;
    logger.debug(`[Extract] Pipeline processed in ${duration}ms`);
  }
}

async function extractPdfContent(file: Blob): Promise<ExtractedContent> {
  const startTime = Date.now();
  logger.debug("[Extract:PDF] Starting PDF extraction...", {
    fileSize: file.size,
    mimeType: file.type,
  });

  try {
    logger.debug("[Extract:PDF] Loading PDF worker...");
    await import("pdfjs-dist/build/pdf.worker.mjs");
    const pdfjs = await ensurePdfjs();

    const buffer = await file.arrayBuffer();
    logger.debug("[Extract:PDF] File converted to ArrayBuffer");

    // Load PDF document
    logger.debug("[Extract:PDF] Loading PDF document...");
    const pdf = await pdfjs.getDocument({
      data: buffer,
      cMapUrl: "../../../node_modules/pdfjs-dist/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "../../../node_modules/pdfjs-dist/standard_fonts/",
      verbosity: 0,
    }).promise;

    logger.debug(
      `[Extract:PDF] PDF loaded successfully, pages: ${pdf.numPages}`,
    );

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      logger.debug(`[Extract:PDF] Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text +=
        content.items.map((item) => ("str" in item ? item.str : "")).join(" ") +
        "\n";
    }

    const result = {
      text: text.trim(),
      metadata: {
        pageCount: pdf.numPages,
        wordCount: countWords(text),
      },
    };

    logger.debug("[Extract:PDF] PDF extraction processed", {
      textLength: result.text.length,
      wordCount: result.metadata.wordCount,
      pageCount: result.metadata.pageCount,
      duration: Date.now() - startTime,
      averageWordsPerPage: Math.round(
        result.metadata.wordCount / result.metadata.pageCount,
      ),
    });

    return result;
  } catch (error) {
    logger.error("[Extract:PDF] Error extracting PDF content:", error);
    throw error;
  }
}

async function extractDocxContent(file: Blob): Promise<ExtractedContent> {
  logger.debug("[Extract:DOCX] Starting DOCX extraction...");
  try {
    const arrayBuffer = await file.arrayBuffer();
    logger.debug("[Extract:DOCX] File converted to ArrayBuffer");

    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    const content = {
      text,
      metadata: {
        wordCount: countWords(text),
      },
    };

    logger.debug("[Extract:DOCX] DOCX extraction processed", {
      textLength: content.text.length,
      wordCount: content.metadata.wordCount,
    });

    return content;
  } catch (error) {
    logger.error("[Extract:DOCX] Error extracting DOCX content:", error);
    throw error;
  }
}

async function extractTextContent(file: Blob): Promise<ExtractedContent> {
  logger.debug("[Extract:TXT] Starting text extraction...");
  try {
    const text = await file.text();

    const content = {
      text,
      metadata: {
        wordCount: countWords(text),
      },
    };

    logger.debug("[Extract:TXT] Text extraction processed", {
      textLength: content.text.length,
      wordCount: content.metadata.wordCount,
    });

    return content;
  } catch (error) {
    logger.error("[Extract:TXT] Error extracting text content:", error);
    throw error;
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
