/**
 * OpenAI Image Generation Tool
 *
 * Domain: AI Tools - Image Generation
 * Responsibility: Generate images through OpenAI's image_generation tool
 * Depends on: createTool, openai-responses service
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  callOpenAiResponses,
  extractImagesFromOutput,
  extractTextFromOutput,
  extractToolCalls,
  type ImageBlock,
  type ToolCallRecord,
} from "@/server/services/ai-sdk/openai-responses";
import { runToolSpan } from "@/lib/observability/sentry";
import { createTool, createToolSchema, stringProp } from "./create-tool";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-5-mini";

// ============================================================================
// SCHEMA (JSON Schema)
// ============================================================================

const imageGenerationSchema = createToolSchema(
  {
    prompt: stringProp("The prompt describing the image to generate"),
    model: {
      type: "string",
      description: "OpenAI model to use for image generation",
      default: DEFAULT_IMAGE_MODEL,
    },
    size: stringProp("Image size (e.g., '1024x1024', '512x512')"),
    background: stringProp("Background style for the image"),
    style: stringProp("Art style for the image"),
    quality: stringProp("Image quality level"),
    aspectRatio: stringProp("Aspect ratio (e.g., '16:9', '1:1')"),
    negativePrompt: stringProp("What to avoid in the image"),
  },
  ["prompt"]
);

// ============================================================================
// TYPES
// ============================================================================

interface ImageGenerationInput {
  prompt: string;
  model?: string;
  size?: string;
  background?: string;
  style?: string;
  quality?: string;
  aspectRatio?: string;
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  text: string;
  images: ImageBlock[];
  toolCalls: ToolCallRecord[];
  raw: UntypedJson;
}

// ============================================================================
// TOOL
// ============================================================================

export const openaiImageGenerationTool = createTool<
  ImageGenerationInput,
  ImageGenerationResult
>({
  description:
    "Generate images through OpenAI's image_generation tool (Responses API) using a gpt-5-mini image modality.",
  schema: imageGenerationSchema,
  execute: async ({
    prompt,
    model = DEFAULT_IMAGE_MODEL,
    size,
    background,
    style,
    quality,
    aspectRatio,
    negativePrompt,
  }: ImageGenerationInput): Promise<ImageGenerationResult> => {
    const result = await runToolSpan("openai_image_generation", async (span) => {
      span.setAttribute("ai.tool.model", model);
      span.setAttribute("ai.tool.prompt.length", prompt.length);
      if (size) span.setAttribute("ai.tool.size", size);
      if (background) span.setAttribute("ai.tool.background", background);
      if (style) span.setAttribute("ai.tool.style", style);
      if (quality) span.setAttribute("ai.tool.quality", quality);
      if (aspectRatio) span.setAttribute("ai.tool.aspect_ratio", aspectRatio);
      if (negativePrompt)
        span.setAttribute("ai.tool.negative_prompt.length", negativePrompt.length);

      // Build image_generation tool with configuration inline
      const imageGenConfig: Record<string, UntypedJson> = {};
      if (size) imageGenConfig.size = size;
      if (background) imageGenConfig.background = background;
      if (style) imageGenConfig.style = style;
      if (quality) imageGenConfig.quality = quality;
      if (aspectRatio) imageGenConfig.aspect_ratio = aspectRatio;
      if (negativePrompt) imageGenConfig.negative_prompt = negativePrompt;

      const imageGenTool: Record<string, UntypedJson> = {
        type: "image_generation",
        ...(Object.keys(imageGenConfig).length > 0
          ? { image_generation: imageGenConfig }
          : {}),
      };

      const payload: Record<string, UntypedJson> = {
        model,
        tools: [imageGenTool],
        input: [{ role: "user", content: prompt }],
        stream: true,
      };

      const data = await callOpenAiResponses(payload);
      const text = extractTextFromOutput(data);
      const images = extractImagesFromOutput(data);
      const toolCalls = extractToolCalls(data);

      span.setAttribute("ai.tool.images.count", images.length);

      return {
        text,
        images,
        toolCalls,
        raw: data,
      };
    });

    return result;
  },
});
