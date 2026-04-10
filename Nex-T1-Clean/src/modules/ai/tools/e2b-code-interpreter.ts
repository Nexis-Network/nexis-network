/**
 * E2B Code Interpreter Tool
 * 
 * Domain: AI Tools - Code Execution
 * Responsibility: Execute Python/JS code via E2B Sandbox
 */

import { Sandbox } from "@e2b/code-interpreter";
import {

  createTool,
  createToolSchema,
  stringProp,
  type ToolExecutionContext
} from "./create-tool";
import { resolveToolSandboxId } from "./e2b-tool-context";

import { logger } from '@/lib/logger';
// ============================================================================
// TYPES
// ============================================================================

interface E2BCodeInterpreterInput {
  code: string;
  sandboxID?: string;
  language?: "python" | "javascript" | "bash";
}

export type E2BCodeInterpreterResult = {
  stdout: string;
  stderr: string;
  results: UntypedJson[]; // Charts, data, etc.
  sandboxID: string;
  error?: string;
};

// ============================================================================
// SCHEMA
// ============================================================================

const e2bCodeInterpreterSchema = createToolSchema(
  {
    code: stringProp("The code to execute", { minLength: 1 }),
    sandboxID: stringProp("Existing sandbox ID to reuse"),
    language: stringProp("Programming language (python, javascript, bash)", { 
      default: "python",
      enum: ["python", "javascript", "bash"] 
    }),
  },
  ["code"]
);

// ============================================================================
// TOOL
// ============================================================================

export const e2bCodeInterpreterTool = createTool<E2BCodeInterpreterInput, E2BCodeInterpreterResult>({
  description: "Execute ad hoc code in a secure E2B cloud sandbox. Supports Python (default), JavaScript, and Bash. Use this for calculations, data analysis, inspection, and one-off scripts. Do not use this tool to create or edit project files, install npm packages, or start preview servers; use e2b_write_file, e2b_read_file, e2b_list_dir, and e2b_npm_* for workspace edits and app execution. `sandboxID` is optional: omit it or pass `default` on the first call to create/reuse a sandbox, then reuse the returned `sandboxID` in later calls. Returns stdout, stderr, and generated artifacts. To render an interactive chart, your code MUST print a JSON object to stdout with this structure: { \"identifier\": \"interactive-chart\", \"data\": { \"config\": { \"type\": \"line|bar|scatter|pie\", \"title\": \"...\", \"xAxisKey\": \"...\", \"yAxisKeys\": [\"...\"] }, \"data\": [...] } }.",
  schema: e2bCodeInterpreterSchema,
  execute: async (input: E2BCodeInterpreterInput, context?: ToolExecutionContext): Promise<E2BCodeInterpreterResult> => {
    const sandboxID = resolveToolSandboxId(input.sandboxID, context);
    const { code, language = "python" } = input;
    const apiKey = process.env.E2B_API_KEY;

    if (!apiKey) {
      return {
        stdout: "",
        stderr: "E2B_API_KEY is not configured.",
        results: [],
        sandboxID: "",
        error: "Missing API Key",
      };
    }

    let sbx: Sandbox | undefined;

    try {
      // Connect to existing or create new sandbox
      if (sandboxID) {
        try {
          sbx = await Sandbox.connect(sandboxID);
        } catch {
          logger.warn(`Failed to connect to sandbox ${sandboxID}, creating new one.`);
          sbx = await Sandbox.create();
        }
      } else {
        sbx = await Sandbox.create();
      }

      // Execute code based on language
      let result;
      
      if (language === "python") {
        result = await sbx.runCode(code);
      } else if (language === "javascript") {
        // Javascript/Node execution via shell
        const cmd = await sbx.commands.run(`node -e "${code.replace(/"/g, '\\"')}"`);
        result = {
          logs: { stdout: [cmd.stdout], stderr: [cmd.stderr] },
          results: [] // No rich results for generic shell execution yet
        };
      } else {
        // Bash
        const cmd = await sbx.commands.run(code);
        result = {
          logs: { stdout: [cmd.stdout], stderr: [cmd.stderr] },
          results: []
        };
      }

      // Process results to look for interactive charts
      // The prompt instructs the model to print a JSON with identifier: "interactive-chart"
      const stdout = result.logs?.stdout?.join("") || "";
      const richResults: UntypedJson[] = result.results || [];

      // Try to parse stdout for hidden JSON charts if not in results
      // This is a backup if the library doesn't strictly return the object in rich results
      try {
           const jsonMatch = stdout.match(/\{.*"identifier":\s*"interactive-chart".*\}/s);
           if (jsonMatch) {
               const chartData = JSON.parse(jsonMatch[0]);
               richResults.push(chartData);
           }
      } catch {
          // Ignore parse errors, just means no chart in stdout
      }

      return {
        stdout: stdout,
        stderr: result.logs?.stderr?.join("") || "",
        results: richResults,
        sandboxID: sbx.sandboxId,
      };

    } catch (error) {
      return {
        stdout: "",
        stderr: error instanceof Error ? error.message : "Internal E2B Tool Error",
        results: [],
        sandboxID: sbx?.sandboxId || "",
        error: "Execution Failed",
      };
    } finally {
        // We do NOT close the sandbox here, because we want persistence.
        // The sandbox will timeout automatically (default 1h) or be killed explicitly later.
    }
  },
});
