/**
 * Preference Extractor
 * Automatically detects and stores user preferences from conversations
 */

import { generateObject } from "ai";
import { openai } from "@/server/services/ai-sdk/openai";
import { z } from "zod";
import { addMemorySafe, isMem0Configured } from "./mem0-client";


import { logger } from '@/lib/logger';
const PreferenceSchema = z.object({
  preferences: z.array(
    z.object({
      category: z.enum(["trading", "analysis", "chains", "protocols", "style", "general"]),
      statement: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

/**
 * Extract preferences from user message
 * Uses gpt-5-nano for cost efficiency
 */
export async function extractAndStorePreferences(
  userId: string,
  userMessage: string,
): Promise<Array<{ category: string; statement: string; confidence: number }>> {
  if (!isMem0Configured()) {
    return [];
  }

  // Skip very short messages
  if (userMessage.length < 20) {
    return [];
  }

  // Skip commands
  if (userMessage.startsWith("/")) {
    return [];
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-5-nano"),
      schema: PreferenceSchema,
      prompt: `Extract user preferences from this message: "${userMessage}"

Only extract CLEAR STATEMENTS OF PREFERENCE, not questions or general statements.

Examples:
- "I prefer Arbitrum" → { category: "chains", statement: "User prefers Arbitrum network", confidence: 0.9 }
- "I like short responses" → { category: "style", statement: "User prefers concise responses", confidence: 0.85 }
- "What's the best DEX?" → NO PREFERENCE (just a question)
- "Tell me about Uniswap" → NO PREFERENCE (request for information)

Return an empty array if no clear preferences found.`,
    });

    const stored: Array<{ category: string; statement: string; confidence: number }> = [];

    // Store high-confidence preferences only
    for (const pref of object.preferences) {
      if (pref.confidence > 0.7) {
        const result = await addMemorySafe(userId, pref.statement, {
          category: pref.category,
          confidence: pref.confidence,
          minConfidence: 0.7,
          preventDuplicates: true,
          metadata: { source: "preference_extractor" },
        });

        if (result.stored) {
          stored.push({
            category: pref.category,
            statement: pref.statement,
            confidence: pref.confidence,
          });
          logger.debug(`[Preference Extracted] ${pref.category}: ${pref.statement.slice(0, 50)}`);
        }
      }
    }

    return stored;
  } catch (error) {
    logger.error("[Preference Extraction] Error:", error);
    return [];
  }
}

/**
 * Extract preferences from multiple messages (batch processing)
 */
export async function extractPreferencesFromHistory(
  userId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<number> {
  let totalExtracted = 0;

  for (const message of messages) {
    if (message.role === "user") {
      const prefs = await extractAndStorePreferences(userId, message.content);
      totalExtracted += prefs.length;
    }
  }

  return totalExtracted;
}
