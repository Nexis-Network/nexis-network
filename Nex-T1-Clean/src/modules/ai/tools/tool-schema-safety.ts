export const TOOL_SCHEMA_INVALID_ERROR = "tool_schema_invalid";

type ToolSchemaLike = {
  type?: unknown;
  properties?: unknown;
  additionalProperties?: unknown;
};

export function isPermissiveFallbackToolSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") {
    return false;
  }

  const record = schema as ToolSchemaLike;
  if (record.type !== "object") {
    return false;
  }

  if (!record.properties || typeof record.properties !== "object") {
    return false;
  }

  return Object.keys(record.properties as Record<string, unknown>).length === 0 &&
    record.additionalProperties === true;
}

export function assertFailClosedToolSchema(
  schema: unknown,
  toolName: string,
): void {
  if (isPermissiveFallbackToolSchema(schema)) {
    throw new Error(`${TOOL_SCHEMA_INVALID_ERROR}: ${toolName}`);
  }
}
