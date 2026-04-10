import type { Tool } from "ai";
import { z } from "zod";
import { withArtifactCache, type ExecutableTool } from "@/server/services/redis/cache-managers/artifact-cache";
import { BurnRateArtifact, type BurnRateArtifactData } from "./burn-rate";
import { TableEditorArtifact, type TableEditorArtifactData } from "@/modules/ai/artifacts/table-editor";

// Wrapper schema for type inference - the actual schema is validated by the artifact
const BurnRateInputSchema = z.object({}).passthrough();
const TableEditorInputSchema = z.object({}).passthrough();

// Define tools with explicit type casting to work around AI SDK type constraints
const burnRateTool: ExecutableTool = {
  description: "Create or update burn rate analysis artifacts with structured chart data.",
  inputSchema: BurnRateInputSchema,
  execute: async (input: z.infer<typeof BurnRateInputSchema>) => {
    return BurnRateArtifact.create(input as BurnRateArtifactData);
  },
};

const tableEditorTool: ExecutableTool = {
  description: "Create interactive table editor artifacts for structured data manipulation.",
  inputSchema: TableEditorInputSchema,
  execute: async (input: z.infer<typeof TableEditorInputSchema>) => {
    return TableEditorArtifact.create(input as TableEditorArtifactData);
  },
};

// Export all tools
export const tools = {
  burnRate: withArtifactCache(burnRateTool, "burn-rate-chart"),
  tableEditor: withArtifactCache(tableEditorTool, "table-editor"),
} satisfies Record<string, Tool>;
