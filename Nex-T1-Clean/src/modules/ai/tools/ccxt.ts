import { createMcpCommandTool } from "./mcp-tool-factory";
import { CcxtMcpClient, defaultCcxtClient } from "@/server/services/mcp/ccxt-client";

const CCXT_TOOL_NAMES = [
  "fetch_ticker",
  "fetch_ohlcv",
  "fetch_order_book",
  "fetch_markets",
  "fetch_balance",
  "fetch_currencies",
  "fetch_status",
] as const;

export const ccxtTool = createMcpCommandTool({
  name: "ccxt",
  description:
    "Retrieve unified market data (tickers, order books, OHLCV) from over 100+ exchanges via CCXT.",
  commandNames: CCXT_TOOL_NAMES,
  client: defaultCcxtClient,
  clientFactory: () => new CcxtMcpClient(),
});
