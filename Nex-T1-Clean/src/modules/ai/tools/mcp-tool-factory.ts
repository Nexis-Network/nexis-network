/**
 * MCP Tool Factory
 *
 * Domain: AI Tools - MCP Integration
 * Responsibility: Creates AI SDK tools from MCP (Model Context Protocol) clients
 * Depends on: createTool, MCP client base
 * Notes: Modernized to use AI SDK 5.0 native tool pattern with JSON Schema.
 */

import { createTool, createToolSchema, stringProp, arrayProp, objectProp } from "./create-tool";
import type {
  HttpMcpClient,
  McpToolInvocationResult,
} from "@/server/services/mcp/base-client";
import { runToolSpan } from "@/lib/observability/sentry";
import type { JSONSchema7 } from "json-schema";

// ============================================================================
// TYPES
// ============================================================================

export type CreateMcpCommandToolOptions<Command extends readonly string[]> = {
  name: string;
  description: string;
  commandNames: Command;
  client: HttpMcpClient<Command[number]>;
  clientFactory?: () => HttpMcpClient<Command[number]>;
  beforeInvoke?: (params: {
    command: Command[number];
    args: Record<string, UntypedJson>;
  }) => Promise<void> | void;
  afterInvoke?: (params: {
    command: Command[number];
    args: Record<string, UntypedJson>;
    result: McpToolInvocationResult<Command[number]>;
  }) => Promise<void> | void;
};

interface McpInvocationInput {
  command: string;
  args?: Array<{ key: string; value: UntypedJson }>;
}

interface McpInvocationOutput {
  command: string;
  text?: string;
  response?: UntypedJson;
  toolResult?: UntypedJson;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert args array to record
 */
function argsArrayToRecord(
  args?: Array<{ key: string; value: UntypedJson }>
): Record<string, UntypedJson> {
  if (!args) return {};
  return Object.fromEntries(args.map(({ key, value }) => [key, value]));
}

// ============================================================================
// FACTORY
// ============================================================================

export const createMcpCommandTool = <Command extends readonly string[]>(
  options: CreateMcpCommandToolOptions<Command>
) => {
  const {
    name,
    commandNames,
    description,
    client,
    clientFactory,
    beforeInvoke,
    afterInvoke,
  } = options;

  // Build schema with command enum
  const schema = createToolSchema(
    {
      command: {
        type: "string",
        description: "MCP tool name to invoke.",
        enum: [...commandNames],
      } as JSONSchema7,
      args: arrayProp(
        "Arguments passed to the MCP tool invocation as key-value pairs.",
        objectProp("Argument entry", {
          key: stringProp("Argument name"),
          value: {
            description: "Argument value (string, number, boolean, object, or array)",
          } as JSONSchema7,
        })
      ),
    },
    ["command"]
  );

  return createTool<McpInvocationInput, McpInvocationOutput>({
    description,
    schema,
    execute: async ({ command, args }): Promise<McpInvocationOutput> => {
      // Convert arrays back to records
      const argsRecord = argsArrayToRecord(args);

      const response = await runToolSpan(name, async (span) => {
        span.setAttribute("ai.tool.command", command);
        span.setAttribute("ai.tool.args.count", Object.keys(argsRecord).length);
        span.setAttribute("ai.tool.connection_overrides", false);

        if (beforeInvoke) {
          await beforeInvoke({
            command: command as Command[number],
            args: argsRecord,
          });
        }

        const invocationClient = clientFactory ? clientFactory() : client;

        const result = await invocationClient.invokeRaw(
          command as Command[number],
          argsRecord
        );

        if (afterInvoke) {
          await afterInvoke({
            command: command as Command[number],
            args: argsRecord,
            result,
          });
        }

        span.setAttribute("ai.tool.response.ok", result.ok);
        if ("statusCode" in result) {
          const status = (result as { statusCode?: UntypedJson }).statusCode;
          if (typeof status === "number") {
            span.setAttribute("ai.tool.response.status_code", status);
          }
        }

        return result;
      });

      if (!response.ok) {
        throw new Error(response.text || "MCP invocation returned an error");
      }

      return {
        command,
        text: response.text,
        response: response.response,
        toolResult: response.toolResult,
      };
    },
  });
};
