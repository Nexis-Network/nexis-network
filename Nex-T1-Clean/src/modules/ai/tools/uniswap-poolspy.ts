import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  UniswapPoolSpyMcpClient,
  defaultUniswapPoolSpyClient,
} from "@/server/services/mcp/uniswap-poolspy-client";

const UNISWAP_POOLSPY_TOOL_NAMES = ["get_new_pools"] as const;

export const uniswapPoolSpyTool = createMcpCommandTool({
  name: "uniswapPoolSpy",
  description:
    "Monitor newly created Uniswap V3 pools across supported networks with customizable filters.",
  commandNames: UNISWAP_POOLSPY_TOOL_NAMES,
  client: defaultUniswapPoolSpyClient,
  clientFactory: () => new UniswapPoolSpyMcpClient(),
});
