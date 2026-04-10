/**
 * OpenAI Code Interpreter Tool
 * 
 * Domain: AI Tools - Code Execution
 * Responsibility: Execute Python code via OpenAI's code_interpreter
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import {
  createTool,
  createToolSchema,
  stringProp,
  numberProp,
  arrayProp,
} from "./create-tool";
import {
  callOpenAiResponses,
  extractTextFromOutput,
  extractToolCalls,
  type ToolCallRecord,
} from "@/server/services/ai-sdk/openai-responses";
import { runToolSpan } from "@/lib/observability/sentry";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CODE_MODEL =
  process.env.OPENAI_CODE_INTERPRETER_MODEL ??
  process.env.OPENAI_FILE_SEARCH_MODEL ??
  process.env.OPENAI_MCP_MODEL ??
  "gpt-5-mini";

// ============================================================================
// TYPES
// ============================================================================

interface CodeInterpreterInput {
  prompt: string;
  model?: string;
  temperature?: number;
  files?: string[];
}

export type CodeInterpreterResult = {
  text: string;
  toolCalls: ToolCallRecord[];
  raw: UntypedJson;
  error?: string;
};

// ============================================================================
// SCHEMA
// ============================================================================

const codeInterpreterSchema = createToolSchema(
  {
    prompt: stringProp("Provide instructions for the code interpreter", { minLength: 1 }),
    model: stringProp("OpenAI model to use", { default: DEFAULT_CODE_MODEL }),
    temperature: numberProp("Sampling temperature", { minimum: 0, maximum: 2 }),
    files: arrayProp("File IDs to analyze", { type: "string", minLength: 1 }),
  },
  ["prompt"],
);

// ============================================================================
// TOOL
// ============================================================================

export const openaiCodeInterpreterTool = createTool<CodeInterpreterInput, CodeInterpreterResult>({
  description:
    "Execute Python code and data analysis through OpenAI's code_interpreter tool (Responses API).",
  schema: codeInterpreterSchema,
  execute: async (input: CodeInterpreterInput): Promise<CodeInterpreterResult> => {
    const { prompt, model = DEFAULT_CODE_MODEL, temperature, files } = input;

    try {
      const result = await runToolSpan("openai_code_interpreter", async (span) => {
        span.setAttribute("ai.tool.model", model);
        span.setAttribute("ai.tool.prompt.length", prompt.length);
        span.setAttribute("ai.tool.files.count", files ? files.length : 0);
        if (typeof temperature === "number") {
          span.setAttribute("ai.tool.temperature", temperature);
        }

        const content = [
          {
            type: "input_text",
            text: prompt,
          },
          ...(files && files.length > 0
            ? files.map((fileId: string) => ({
                type: "input_file",
                file_id: fileId,
              }))
            : []),
        ];

        const payload: Record<string, UntypedJson> = {
          model,
          tools: [{ type: "code_interpreter" }],
          input: [{ role: "user", content }],
          stream: true,
        };

        if (typeof temperature === "number") {
          payload.temperature = temperature;
        }

        const data = await callOpenAiResponses(payload);
        const text = extractTextFromOutput(data);
        const toolCalls = extractToolCalls(data);

        return {
          text,
          toolCalls,
          raw: data,
        };
      });

      return result;
    } catch (error) {
      return {
        text: "",
        toolCalls: [],
        raw: null,
        error: error instanceof Error ? error.message : "Failed to run the OpenAI code interpreter.",
      };
    }
  },
});

// Export schema for backward compatibility
export { codeInterpreterSchema };
