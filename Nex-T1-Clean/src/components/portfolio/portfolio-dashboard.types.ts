import type { AggregatedPortfolio } from "@/server/services/portfolio-service";

export type PortfolioDashboardWallet = AggregatedPortfolio["wallets"][number];
