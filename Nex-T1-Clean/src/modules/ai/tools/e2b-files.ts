/**
 * E2B File System Tools
 * 
 * Domain: AI Tools - File System
 * Responsibility: Manage files in the E2B Sandbox (read, write, list)
 */

import { Sandbox } from "@e2b/code-interpreter";
import {
  createTool,
  createToolSchema,
  stringProp,
  type ToolExecutionContext,
  // booleanProp,
} from "./create-tool";
import { DEFAULT_E2B_SANDBOX_USER } from "./e2b-runtime-constants";
import { resolveToolSandboxId } from "./e2b-tool-context";

// ============================================================================
// SHARED TYPES & HELPERS
// ============================================================================

interface E2BFilesInput {
  path: string;
  content?: string;
  sandboxID?: string;
}

const connectToSandbox = async (sandboxID?: string): Promise<Sandbox> => {
    if (!process.env.E2B_API_KEY) throw new Error("Missing E2B_API_KEY");
    
    if (sandboxID) {
        try {
            return await Sandbox.connect(sandboxID);
        } catch {
            return await Sandbox.create();
        }
    }
    return await Sandbox.create();
};

// ============================================================================
// TOOL: write_file
// ============================================================================

export const write_file = createTool<E2BFilesInput, UntypedJson>({
  description:
    "Write content to a file in the E2B sandbox. Creates directories if they don't exist. `sandboxID` is optional: omit it or pass `default` on the first call to create/reuse a sandbox, then reuse the returned `sandboxID` in later calls.",
  schema: createToolSchema({
      path: stringProp("Absolute or relative path to file", { minLength: 1 }),
      content: stringProp("Content to write"),
      sandboxID: stringProp("Optional sandbox ID to reuse. Omit it or pass `default` to create/reuse a sandbox automatically."),
  }, ["path", "content"]),
  execute: async (input: E2BFilesInput, context?: ToolExecutionContext) => {
    const { path, content, sandboxID } = input;
    try {
        const effectiveSandboxID = resolveToolSandboxId(sandboxID, context);
        const sbx = await connectToSandbox(effectiveSandboxID);
        await sbx.files.write(path, content || "", {
            user: DEFAULT_E2B_SANDBOX_USER,
        });
        return { success: true, path, sandboxID: sbx.sandboxId };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// ============================================================================
// TOOL: read_file
// ============================================================================

export const read_file = createTool<E2BFilesInput, UntypedJson>({
  description:
    "Read content from a file in the E2B sandbox. `sandboxID` is optional: omit it or pass `default` on the first call to create/reuse a sandbox, then reuse the returned `sandboxID` in later calls.",
  schema: createToolSchema({
      path: stringProp("Path to file", { minLength: 1 }),
      sandboxID: stringProp("Optional sandbox ID to reuse. Omit it or pass `default` to create/reuse a sandbox automatically."),
  }, ["path"]),
  execute: async (input: E2BFilesInput, context?: ToolExecutionContext) => {
    const { path, sandboxID } = input;
    try {
        const effectiveSandboxID = resolveToolSandboxId(sandboxID, context);
        const sbx = await connectToSandbox(effectiveSandboxID);
        const content = await sbx.files.read(path, {
            user: DEFAULT_E2B_SANDBOX_USER,
        });
        return { success: true, content, sandboxID: sbx.sandboxId };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// ============================================================================
// TOOL: list_dir
// ============================================================================

export const list_dir = createTool<E2BFilesInput, UntypedJson>({
  description:
    "List files and directories in a path in the E2B sandbox. `sandboxID` is optional: omit it or pass `default` on the first call to create/reuse a sandbox, then reuse the returned `sandboxID` in later calls.",
  schema: createToolSchema({
      path: stringProp("Directory path (default: .)", { default: "." }),
      sandboxID: stringProp("Optional sandbox ID to reuse. Omit it or pass `default` to create/reuse a sandbox automatically."),
  }, ["path"]),
  execute: async (input: E2BFilesInput, context?: ToolExecutionContext) => {
    const { path, sandboxID } = input;
    try {
        const effectiveSandboxID = resolveToolSandboxId(sandboxID, context);
        const sbx = await connectToSandbox(effectiveSandboxID);
        const files = await sbx.files.list(path, {
            user: DEFAULT_E2B_SANDBOX_USER,
        });
        return { success: true, files, sandboxID: sbx.sandboxId };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
