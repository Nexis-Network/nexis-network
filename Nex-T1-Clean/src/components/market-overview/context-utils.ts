import type { HeroCard } from "./market-overview-page.client";
import type { MarketSentiment, NewsArticle, TopMover } from "@/types/market";

type MarketOverviewContextData = {
    heroCards: HeroCard[];
    sentiment: MarketSentiment | null;
    leaderboard: { name: string; symbol: string; priceUsd: number | null }[];
    news: NewsArticle[];
    standouts: TopMover[];
};

export function buildMarketOverviewContext(data: MarketOverviewContextData): string {
    const parts: string[] = [];

    // 1. Market Sentiment
    if (data.sentiment) {
        parts.push(`Market Sentiment: ${data.sentiment.classification || "Neutral"} (Score: ${data.sentiment.score || "N/A"}/100)`);
    }

    // 2. Hero Cards (Key Metrics) - Limit to 5
    if (data.heroCards.length > 0) {
        parts.push("\nKey Market Metrics:");
        data.heroCards.slice(0, 5).forEach((card) => {
            const change = card.delta ? `${card.delta > 0 ? "+" : ""}${card.delta.toFixed(2)}%` : "N/A";
            const price = card.price ? `$${card.price.toLocaleString()}` : "N/A";
            parts.push(`- ${card.label} (${card.pair}): ${price} (${change})`);
        });
    }

    // 3. Top Movers (Standouts) - Limit to 5
    if (data.standouts.length > 0) {
        parts.push("\nTop Movers:");
        data.standouts.slice(0, 5).forEach((asset) => {
            const change = asset.priceChangePercentage24h ? `${asset.priceChangePercentage24h > 0 ? "+" : ""}${asset.priceChangePercentage24h.toFixed(2)}%` : "N/A";
            parts.push(`- ${asset.name} (${asset.symbol.toUpperCase()}): ${change}`);
        });
    }

    // 4. Leaderboard - Limit to 5
    if (data.leaderboard.length > 0) {
        parts.push("\nTop Assets by Market Cap:");
        data.leaderboard.slice(0, 5).forEach((row, index) => {
            const price = row.priceUsd ? `$${row.priceUsd.toLocaleString()}` : "N/A";
            parts.push(`${index + 1}. ${row.name} (${row.symbol.toUpperCase()}): ${price}`);
        });
    }

    // 5. Latest News - Limit to 3
    if (data.news.length > 0) {
        parts.push("\nLatest News Headlines:");
        data.news.slice(0, 3).forEach((article) => {
            parts.push(`- ${article.title} (Source: ${article.source})`);
        });
    }

    // 6. Capabilities & Actions
    parts.push("\nCapabilities & Actions:");
    parts.push("You can control the dashboard using the following tags in your response:");
    parts.push("- Filter Hero Cards: [ACTION:FILTER_HERO|id] (ids: all, gainers, losers, volume, volatility)");
    parts.push("- Navigate to Asset: [ACTION:NAVIGATE|symbol] (e.g., [ACTION:NAVIGATE|BTC])");
    parts.push("- Suggest Swap: [ACTION:SWAP|from_symbol|to_symbol] (e.g., [ACTION:SWAP|ETH|USDC])");

    return parts.join("\n");
}
