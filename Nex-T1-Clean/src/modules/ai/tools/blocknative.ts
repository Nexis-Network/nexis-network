import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  BlocknativeMcpClient,
  defaultBlocknativeClient,
} from "@/server/services/mcp/blocknative-client";

const BLOCKNATIVE_TOOL_NAMES = [
  "predict_gas_price",
  "estimate_gas_cost",
  "get_supported_chains",
] as const;

export const blocknativeTool = createMcpCommandTool({
  name: "blocknative",
  description:
    "Leverage Blocknative gas forecasting and supported chain metadata for transaction planning.",
  commandNames: BLOCKNATIVE_TOOL_NAMES,
  client: defaultBlocknativeClient,
  clientFactory: () => new BlocknativeMcpClient(),
});
