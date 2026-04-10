import {
  asRecord,
  extractSandboxId,
  parseStructuredArtifactResult,
} from "@/components/artifacts/sandbox-workbench-utils";
import { ingestStructuredArtifactTool } from "./sandbox-workbench-artifact-ingestion";
import {
  type SandboxWorkbenchToolBindings,
} from "./sandbox-workbench-ingestion.shared";
import { ingestRuntimeTool } from "./sandbox-workbench-runtime-tool-ingestion";

export function ingestSandboxWorkbenchTool(args: {
  activeTool: UntypedJson;
  bindings: SandboxWorkbenchToolBindings;
}) {
  const toolRecord = asRecord(args.activeTool);
  const toolName = typeof toolRecord.toolName === "string" ? toolRecord.toolName : "";
  const toolArgs = asRecord(toolRecord.args);
  const result = asRecord(toolRecord.result);
  const nestedResult = asRecord(result.result);
  const maybeSandboxId = extractSandboxId(toolArgs, result);

  if (maybeSandboxId) {
    args.bindings.setSandboxId(maybeSandboxId);
  }

  if (toolName === "emit_artifact") {
    const structured = parseStructuredArtifactResult(result);
    if (structured) {
      ingestStructuredArtifactTool(args.bindings, structured);
    }
    return;
  }

  ingestRuntimeTool({
    bindings: args.bindings,
    nestedResult,
    result,
    toolArgs,
    toolName,
  });
}
