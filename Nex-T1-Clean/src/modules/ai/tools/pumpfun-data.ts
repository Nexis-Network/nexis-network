import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  PumpFunDataMcpClient,
  defaultPumpFunDataClient,
} from "@/server/services/mcp/pumpfun-data-client";

const PUMPFUN_DATA_TOOL_NAMES = [
  "get_featured_coins",
  "get_coins",
  "get_coin_info",
] as const;

export const pumpFunDataTool = createMcpCommandTool({
  name: "pumpfun_data",
  description:
    "Query Pump.fun coin data: featured lists, sorted coin feeds, and detailed mint analytics.",
  commandNames: PUMPFUN_DATA_TOOL_NAMES,
  client: defaultPumpFunDataClient,
  clientFactory: () => new PumpFunDataMcpClient(),
});
