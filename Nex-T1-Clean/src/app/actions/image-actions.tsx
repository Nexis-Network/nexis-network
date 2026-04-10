"use server";

import { headers } from "next/headers";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { ensureOpenAIHealth } from "@/server/services/ai-sdk/openai-health";


import { logger } from '@/lib/logger';
/**
 * Image Actions
 * Server actions for image generation and analysis
 */

/**
 * Generate an image using DALL-E 3 via OpenAI API
 */
export async function generateImageAction(prompt: string) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const rateLimit = await checkRateLimit(`openai:image:${ip}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "Image generation rate limit exceeded. Please slow down and try again shortly.",
      };
    }

    await ensureOpenAIHealth({ apiKey });

    // Use OpenAI SDK directly for image generation
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Image generation failed");
    }

    const data = await response.json();
    const imageUrl = data.data[0]?.url;
    const revisedPrompt = data.data[0]?.revised_prompt;

    if (!imageUrl) {
      throw new Error("No image URL returned");
    }

    return {
      success: true,
      url: imageUrl,
      prompt,
      revisedPrompt: revisedPrompt || prompt,
    };
  } catch (error) {
    logger.error("Image generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}

/**
 * Analyze an uploaded image using GPT-4 Vision
 */
export async function analyzeImageAction(imageUrl: string) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const rateLimit = await checkRateLimit(`openai:vision:${ip}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "Vision analysis rate limit exceeded. Please slow down and try again shortly.",
      };
    }

    await ensureOpenAIHealth({ apiKey });

    // Use OpenAI API directly for vision
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image in detail and respond with JSON: {description: string, objects: string[], colors: string[], mood: string, suggestions: string[]}",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error("Vision API request failed");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No analysis returned");
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    return {
      success: true,
      analysis: {
        description: parsed.description || "Image analyzed",
        objects: parsed.objects || [],
        colors: parsed.colors || [],
        mood: parsed.mood || "neutral",
        suggestions: parsed.suggestions || [],
      },
    };
  } catch (error) {
    logger.error("Image analysis failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze image",
    };
  }
}
