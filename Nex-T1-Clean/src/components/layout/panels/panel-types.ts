import type { RefObject } from "react";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";

export type PanelRef = RefObject<{
  resize: (size: number) => void;
} | null>;

export type MarketOverviewRequest = {
  query: string;
  assets?: string[];
  requestedAt: number;
  visible: boolean;
  mode: MarketIntentAnalysis["mode"];
  confidence: MarketIntentAnalysis["confidence"];
};
