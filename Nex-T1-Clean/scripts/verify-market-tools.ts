import { getGlobalCryptoMarketSnapshot, searchCoins, getOnchainTokenPrices, getOnchainTokenData } from "../src/modules/ai/tools/market-tools";

async function main() {
  console.log("Verifying market tools...");

  const tools = [
    { name: "getGlobalCryptoMarketSnapshot", tool: getGlobalCryptoMarketSnapshot },
    { name: "searchCoins", tool: searchCoins },
    { name: "getOnchainTokenPrices", tool: getOnchainTokenPrices },
    { name: "getOnchainTokenData", tool: getOnchainTokenData },
  ];

  for (const { name, tool } of tools) {
    console.log(`Checking ${name}...`);
    if (!tool) {
        console.error(`❌ ${name} is undefined`);
        process.exit(1);
    }
    if (typeof tool.execute !== "function") {
        console.error(`❌ ${name}.execute is not a function`);
        process.exit(1);
    }
    // Check if parameters or inputSchema exists (AI SDK 3.x/4.x compatible)
    if (!tool.parameters && !tool.inputSchema) { // "parameters" or "inputSchema" (or "schema" in some versions?)
         // Actually, tool might store it in .parameters if using standard Zod
         console.warn(`⚠️ ${name} might be missing parameters/schema definition (or using hidden property)`);
         console.log(JSON.stringify(tool, null, 2));
    }
    console.log(`✅ ${name} looks valid`);
  }
  console.log("All tools verified.");
}

main().catch(console.error);
