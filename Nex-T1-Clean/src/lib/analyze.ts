import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import pMap from "p-map";
import { z } from "zod";

import type { Database } from "@/lib/db/types";
import { openai } from "@/server/services/ai-sdk/openai";

import { processDocument as vectorizeDocument } from "./vectorize";


import { logger } from '@/lib/logger';
const analysisSchema = z.object({
  summary: z.string().min(1),
  keywords: z.array(z.string()),
  entities: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
  ),
});

type AnalysisResult = z.infer<typeof analysisSchema>;

export async function analyzeDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  userId: string,
) {
  try {
    logger.debug(`[Analysis] Starting analysis for document ${documentId}`);

    // Get document
    const { data: document, error: docError } = await supabase
      .from("doc_processor_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      logger.error("[Analysis] Document fetch error:", docError);
      throw docError || new Error("Document not found");
    }

    logger.debug(`[Analysis] Retrieved document: ${document.title}`);

    const extractedText = document.extracted_text;
    if (!extractedText) {
      logger.error("[Analysis] No extracted text found for document");
      throw new Error("Document has no extracted text");
    }

    logger.debug(`[Analysis] Found extracted text of length: ${extractedText.length}`);

    // Create analysis task
    const { data: task, error: taskError } = await supabase
      .from("doc_processor_processing_tasks")
      .insert({
        document_id: documentId,
        task_type: "analyze",
        status: "processing",
      })
      .select()
      .single();

    if (taskError) {
      logger.error("[Analysis] Task creation error:", taskError);
      throw taskError;
    }

    logger.debug(`[Analysis] Created analysis task: ${task.id}`);

    // Define processing tasks
    const processingTasks = async () => {
      // Task 1: Analyze content and update document
      logger.debug("[Analysis] Starting content analysis with AI...");
      const analysis = await analyzeContent(extractedText);
      logger.debug("[Analysis] AI analysis complete", {
        summaryLength: analysis.summary.length,
        keywordsCount: analysis.keywords.length,
        entitiesCount: analysis.entities.length,
      });

      // Update document with analysis results
      logger.debug("[Analysis] Updating document with analysis results...");
      const { error: updateError } = await supabase
        .from("doc_processor_documents")
        .update({
          analysis: {
            summary: analysis.summary,
            keywords: analysis.keywords,
          },
          status: "processing",
        })
        .eq("id", documentId)
        .eq("user_id", userId);

      if (updateError) {
        logger.error("[Analysis] Document update error:", updateError);
        throw updateError;
      }

      // Task 2: Store entities in parallel batches
      if (analysis.entities.length > 0) {
        logger.debug(`[Analysis] Storing ${analysis.entities.length} entities...`);

        // Split entities into batches of 10
        const entityBatches = [];
        for (let i = 0; i < analysis.entities.length; i += 10) {
          entityBatches.push(analysis.entities.slice(i, i + 10));
        }

        // Store batches concurrently
        await pMap(
          entityBatches,
          async (batch, batchIndex) => {
            logger.debug(`[Analysis] Storing entity batch ${batchIndex + 1}/${entityBatches.length}`);
            const { error: entityError } = await supabase.from("doc_processor_document_entities").insert(
              batch.map((entity) => ({
                document_id: documentId,
                entity_type: entity.type,
                entity_text: entity.text,
                metadata: entity.metadata || null,
              }))
            );

            if (entityError) {
              logger.error(`[Analysis] Entity batch ${batchIndex + 1} storage error:`, entityError);
              throw entityError;
            }
            logger.debug(`[Analysis] Entity batch ${batchIndex + 1} stored successfully`);
          },
          {
            concurrency: 3, // Process up to 3 batches at a time
            stopOnError: true,
          }
        );

        logger.debug("[Analysis] All entities stored successfully");
      }
    };

    // Execute processing tasks
    await processingTasks();

    // Update task status
    await supabase
      .from("doc_processor_processing_tasks")
      .update({
        status: "processed",
      })
      .eq("id", task.id);

    logger.debug("[Analysis] Analysis task marked as processed");

    // Create vectorization task
    const { error: vectorizeError } = await supabase
      .from("doc_processor_processing_tasks")
      .insert({
        document_id: documentId,
        task_type: "vectorize",
        status: "pending" as const,
      })
      
    if (vectorizeError) {
      logger.error("[Analysis] Vectorization task creation error:", vectorizeError);
      throw vectorizeError;
    }

    logger.debug("[Analysis] Created vectorization task");
    logger.debug(`[Analysis] Analysis pipeline processed for document ${documentId}`);

    // Trigger vectorization pipeline
    logger.debug("[Analysis] Triggering vectorization pipeline...");
    await vectorizeDocument(supabase, documentId, userId);
  } catch (error) {
    logger.error("[Analysis] Pipeline error:", error);

    // Update document status
    logger.debug("[Analysis] Updating document status to error...");
    await supabase
      .from("doc_processor_documents")
      .update({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", documentId)
      .eq("user_id", userId);

    // Update task status if it exists
    const { data: task } = (await supabase
      .from("doc_processor_processing_tasks")
      .select("id")
      .eq("document_id", documentId)
      .eq("task_type", "analyze")
      .single()) as { data: { id: string } | null; error: UntypedJson };

    if (task) {
      logger.debug("[Analysis] Updating task status to error...");
      await supabase
        .from("doc_processor_processing_tasks")
        .update({
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", task.id);
    }

    throw error;
  }
}

async function analyzeContent(text: string): Promise<AnalysisResult> {
  logger.debug("[Analysis] Starting content analysis...");

  // Truncate text if too long (OpenAI has a token limit)
  const maxLength = 15_000; // Roughly 4000 tokens
  const truncatedText = text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  logger.debug(`[Analysis] Text length: ${text.length}, truncated: ${truncatedText.length}`);

  logger.debug("[Analysis] Calling OpenAI...");
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: analysisSchema,
    prompt: `Please analyze the following text and extract key information. Generate a concise summary (max 200 words), up to 10 relevant keywords, and identify named entities (like people, organizations, locations, dates).

Text to analyze:
${truncatedText}`,
  });

  if (!object) {
    logger.error("[Analysis] Failed to generate analysis - no object returned");
    throw new Error("Failed to generate analysis");
  }

  logger.debug("[Analysis] Successfully generated analysis");
  return object;
}
