import type { ToolExecutionContext } from "./create-tool";

export function resolveToolSandboxId(
  sandboxID: string | undefined,
  context?: ToolExecutionContext,
): string | undefined {
  const normalizedInput = sandboxID?.trim();
  if (normalizedInput && normalizedInput.toLowerCase() !== "default") {
    return normalizedInput;
  }

  const metadataSandboxId = context?.metadata?.sandbox_id;
  if (
    typeof metadataSandboxId === "string" &&
    metadataSandboxId.trim().length > 0
  ) {
    return metadataSandboxId.trim();
  }

  return undefined;
}
