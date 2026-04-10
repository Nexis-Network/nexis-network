import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  CryptoSentimentMcpClient,
  defaultCryptoSentimentClient,
} from "@/server/services/mcp/crypto-sentiment-client";

const CRYPTO_SENTIMENT_TOOL_NAMES = [
  "get_sentiment_balance",
  "get_social_volume",
  "alert_social_shift",
  "get_trending_words",
  "get_social_dominance",
] as const;

export const cryptoSentimentTool = createMcpCommandTool({
  name: "cryptoSentiment",
  description:
    "Access Santiment-powered social sentiment analytics, including balance, dominance, trending words, and volume shifts.",
  commandNames: CRYPTO_SENTIMENT_TOOL_NAMES,
  client: defaultCryptoSentimentClient,
  clientFactory: () => new CryptoSentimentMcpClient(),
});
