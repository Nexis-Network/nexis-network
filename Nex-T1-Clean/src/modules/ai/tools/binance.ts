import { createMcpCommandTool } from "./mcp-tool-factory";
import { BinanceMcpClient, defaultBinanceClient } from "@/server/services/mcp/binance-client";

const BINANCE_TOOL_NAMES = [
  "get_market_data",
  "test_futures_endpoints",
  "get_futures_open_interest",
  "get_futures_funding_rate",
  "get_klines",
  "subscribe_market_data",
] as const;

export const binanceTool = createMcpCommandTool({
  name: "binance",
  description:
    "Retrieve Binance market data via REST or subscribe to real-time WebSocket feeds for spot and futures markets.",
  commandNames: BINANCE_TOOL_NAMES,
  client: defaultBinanceClient,
  clientFactory: () => new BinanceMcpClient(),
});
