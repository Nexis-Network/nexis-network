import type { Tool } from "ai";

export type ChatbotToolName = string;

export type ToolCategory =
  | "search"
  | "ai"
  | "wallet"
  | "defi"
  | "market"
  | "onchain"
  | "solana"
  | "bitcoin"
  | "browser"
  | "optional";

export interface ToolLoader {
  load: () => Promise<Tool>;
  category: ToolCategory;
  enabled?: () => boolean | Promise<boolean>;
}
