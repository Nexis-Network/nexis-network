import { BurnRateArtifactData } from "@/components/artifacts/features/analysis/burn-rate-artifact";
import { PortfolioAnalysisData } from "@/components/artifacts/features/analysis/portfolio-analysis-artifact";
import { TransactionSimulationData } from "@/components/artifacts/features/trading/transaction-simulation-artifact";
import { ResearchArtifactData } from "@/components/artifacts/features/general/research-artifact";
import { AgentDaosData } from "@/components/artifacts/features/analysis/agent-daos-artifact";
import { CombinedHoldingsData } from "@/components/artifacts/features/analysis/combined-holdings-artifact";
import { StakingPositionsData } from "@/components/artifacts/features/analysis/staking-positions-artifact";
import { TokenArtifactData } from "@/components/artifacts/features/trading/token-artifact";
import { PumpFunArtifactData } from "@/modules/ai/artifacts/pumpfun";
import { TableEditorArtifactData } from "@/components/artifacts/features/general/table-editor-artifact";
import type { MarketListArtifactData } from "@/components/artifacts/polymarket/market-list-artifact";
import type { OrderbookArtifactData } from "@/components/artifacts/polymarket/orderbook-artifact";
import type { PositionsArtifactData } from "@/components/artifacts/polymarket/positions-artifact";
import type { TradePreviewArtifactData } from "@/components/artifacts/polymarket/trade-preview-artifact";

// Define a discriminated union for the result
export type ParsedArtifact =
  | { type: "token"; data: TokenArtifactData }
  | { type: "research"; data: ResearchArtifactData }
  | { type: "transaction"; data: TransactionSimulationData }
  | { type: "burn_rate"; data: BurnRateArtifactData }
  | { type: "portfolio"; data: PortfolioAnalysisData }
  | { type: "staking"; data: StakingPositionsData }
  | { type: "holdings"; data: CombinedHoldingsData }
  | { type: "daos"; data: AgentDaosData }
  | { type: "pump_fun"; data: PumpFunArtifactData }
  | { type: "table"; data: TableEditorArtifactData }
  | { type: "polymarket_markets"; data: MarketListArtifactData }
  | { type: "polymarket_orderbook"; data: OrderbookArtifactData }
  | { type: "polymarket_positions"; data: PositionsArtifactData }
  | { type: "polymarket_trade_preview"; data: TradePreviewArtifactData };

export const tryParseArtifact = (code: string): ParsedArtifact | null => {
  try {
    const data = JSON.parse(code);
    if (typeof data !== "object" || data === null) return null;

    // 1. PumpFunArtifact (Complex discriminated union on 'view')
    if (
        "view" in data && 
        ["trade", "coin_analysis", "chat_digest", "trend_report"].includes(data.view)
    ) {
        // Additional validation could go here, but 'view' is strong signal
        return { type: "pump_fun", data: data as PumpFunArtifactData };
    }

    // 2. TokenArtifact
    if (
      "name" in data &&
      "symbol" in data &&
      "bondingCurveProgress" in data &&
      "recentChat" in data
    ) {
      return { type: "token", data: data as TokenArtifactData };
    }

    // 3. TransactionSimulationArtifact
    if (
        "fromToken" in data &&
        "toToken" in data &&
        "gasEstimate" in data &&
        "steps" in data
    ) {
        return { type: "transaction", data: data as TransactionSimulationData };
    }

    // 4. BurnRateArtifact
    if ("monthlyBurn" in data && "runway" in data) {
        return { type: "burn_rate", data: data as BurnRateArtifactData };
    }

    // 5. ResearchArtifact
    if ("items" in data && Array.isArray(data.items) && "query" in data) {
        // Shallow check on items
        if (data.items.length > 0 && "url" in data.items[0] && "title" in data.items[0]) {
             return { type: "research", data: data as ResearchArtifactData };
        }
        if (data.items.length === 0) {
             return { type: "research", data: data as ResearchArtifactData };
        }
    }

    // 6. AgentDaosArtifact
    if ("daos" in data && Array.isArray(data.daos)) {
        if (data.daos.length > 0 && "treasuryValue" in data.daos[0] && "proposalCount" in data.daos[0]) {
             return { type: "daos", data: data as AgentDaosData };
        }
    }

    // 7. CombinedHoldingsArtifact (Must come before Portfolio if overlapping, but Portfolio has riskScore)
    if ("wallets" in data && Array.isArray(data.wallets) && "totalValue" in data) {
        return { type: "holdings", data: data as CombinedHoldingsData };
    }

    // 8. PortfolioAnalysisArtifact
    if ("riskScore" in data && "assets" in data && "totalValue" in data) {
        return { type: "portfolio", data: data as PortfolioAnalysisData };
    }

    // 9. StakingPositionsArtifact
    if ("totalStaked" in data && "averageApy" in data && "positions" in data) {
        return { type: "staking", data: data as StakingPositionsData };
    }

    // 10. TableEditorArtifact
    if ("columns" in data && Array.isArray(data.columns) && ("rows" in data || "data" in data)) {
        return { type: "table", data: data };
    }

    // 11. Polymarket: Market List
    if ("markets" in data && Array.isArray(data.markets) && "total" in data && "hasMore" in data) {
        return { type: "polymarket_markets", data: data as MarketListArtifactData };
    }

    // 12. Polymarket: Orderbook
    if ("bids" in data && "asks" in data && "midpoint" in data && "tokenId" in data) {
        return { type: "polymarket_orderbook", data: data as OrderbookArtifactData };
    }

    // 13. Polymarket: Positions (discriminate from generic portfolio by "unrealizedPnl" + array "positions")
    if ("positions" in data && Array.isArray(data.positions) && "unrealizedPnl" in data && "totalValue" in data && !("riskScore" in data)) {
        return { type: "polymarket_positions", data: data as PositionsArtifactData };
    }

    // 14. Polymarket: Trade Preview
    if ("order" in data && "estimate" in data && "approvalToken" in data) {
        return { type: "polymarket_trade_preview", data: data as TradePreviewArtifactData };
    }

  } catch {
    return null;
  }
  return null;
};

