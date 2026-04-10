import { loadAiSdkMcpTools } from "../src/server/mcp/ai-sdk-mcp-tools";

function truncate(text: string, max = 1400): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…(truncated, len=${text.length})`;
}

async function run() {
  process.env.MCP_NEX_MCP_URL = process.env.MCP_NEX_MCP_URL || "https://mcp.nex-t1.ai/mcp";

  const { tools, loaded, close } = await loadAiSdkMcpTools({ purpose: "chat_readonly" });
  console.log("loaded:", loaded);
  console.log("toolCount:", Object.keys(tools).length);

  const picks: Array<{ name: string; args: unknown }> = [
    { name: "mcp_nex__defi_supported_chains", args: {} },
    { name: "mcp_nex__defi_supported_dexes", args: { network: "ethereum" } },
    { name: "mcp_nex__defi_liquidity_sources", args: { chainId: 1 } },
    { name: "mcp_nex__defi_trending_pools", args: { chainId: 1, limit: 5 } },
    { name: "mcp_nex__defi_coingecko_networks", args: {} },
    { name: "mcp_nex__web3research_trending", args: {} },
    { name: "mcp_nex__cryptoprojects_top_protocols", args: { limit: 5 } },
    { name: "mcp_nex__aave_reserves_overview", args: {} },
    { name: "mcp_nex__debank_user_total_balance", args: { address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" } },
    { name: "mcp_nex__cryptopanic_latest_news", args: { limit: 3 } },
  ];

  for (const pick of picks) {
    const tool = tools[pick.name];
    if (!tool || typeof tool.execute !== "function") {
      console.log(`\n=== ${pick.name} (missing) ===`);
      continue;
    }

    try {
      const out = await tool.execute(pick.args as unknown);
      const text = typeof out === "string" ? out : JSON.stringify(out, null, 2);
      console.log(`\n=== ${pick.name} (ok) ===`);
      console.log(truncate(text));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`\n=== ${pick.name} (error) ===`);
      console.log(message);
    }
  }

  await close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
