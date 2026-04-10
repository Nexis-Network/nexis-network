import "server-only";

export {
  getLegacyCoinbaseAgentKitInstance as getAgentKitInstance,
  isCoinbaseAgentKitConfigured as isAgentKitConfigured,
  resetLegacyCoinbaseAgentKitCache as resetAgentKit,
} from "@/server/services/coinbase-agentkit/legacy";
