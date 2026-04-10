import { unwrapApiPayload } from "@/lib/api-platform/payload";
import type { MCPRegistry } from "@/lib/mcp/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMcpSource(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.type === "string" && typeof value.location === "string";
}

function isMcpServer(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.vendor === "string" &&
    isMcpSource(value.source) &&
    (value.tags === undefined || Array.isArray(value.tags))
  );
}

export function isMcpRegistry(value: unknown): value is MCPRegistry {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.version !== "string" || !Array.isArray(value.servers)) {
    return false;
  }

  return value.servers.every((server) => isMcpServer(server));
}

export function parseMcpRegistryPayload(payload: unknown): MCPRegistry | null {
  const unwrappedPayload = unwrapApiPayload<unknown>(payload);
  if (!isMcpRegistry(unwrappedPayload)) {
    return null;
  }

  return unwrappedPayload;
}
