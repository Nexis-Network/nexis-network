import type { CryptoHeadline, PythMarketSnapshot } from "@/modules/prices/pyth/market";

export const buildMarketContext = (
  snapshot: PythMarketSnapshot,
  news?: CryptoHeadline[],
) => {
  const format = (value: number) => {
    if (Math.abs(value) >= 100) {
      return value.toFixed(2);
    }
    if (Math.abs(value) >= 1) {
      return value.toFixed(4);
    }
    return value.toFixed(6);
  };

  const formatCompactUsd = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) {
      return "—";
    }
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `$${value.toFixed(2)}`;
    }
  };

  const pythPrice = snapshot.price;
  const coingeckoPrice = snapshot.coingecko?.priceUsd ?? null;
  const moralisPrice = snapshot.moralis?.priceUsd ?? null;

  const prices = [pythPrice, coingeckoPrice, moralisPrice].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  const priceSpreadPct =
    prices.length >= 2
      ? ((Math.max(...prices) - Math.min(...prices)) / Math.max(1e-9, Math.min(...prices))) * 100
      : null;

  const lines = [
    `Live market data from the Pyth Network for ${snapshot.ticker} (quoted in ${snapshot.quoteCurrency}) as of ${new Date(
      snapshot.publishTime * 1000,
    ).toISOString()}.`,
    snapshot.assetSummary ? `- Summary: ${snapshot.assetSummary}` : null,
    `- Last price: ${format(snapshot.price)}`,
    `- 24h change: ${format(snapshot.change24h)} (${snapshot.change24hPct.toFixed(2)}%)`,
    `- 24h high: ${format(snapshot.high24h)}`,
    `- 24h low: ${format(snapshot.low24h)}`,
    `- 24h volume: ${snapshot.volume24h.toFixed(2)} ${snapshot.quoteCurrency}`,
    snapshot.emaPrice !== null ? `- EMA price: ${format(snapshot.emaPrice)}` : `- EMA price: not available`,
    snapshot.marketCapUsd != null ? `- Market cap (CoinGecko): ${formatCompactUsd(snapshot.marketCapUsd)}` : null,
    snapshot.volume24hUsd != null ? `- 24h volume (CoinGecko): ${formatCompactUsd(snapshot.volume24hUsd)}` : null,
    snapshot.coingecko
      ? `- CoinGecko: ${snapshot.coingecko.priceUsd != null ? format(snapshot.coingecko.priceUsd) : "—"} (24h ${snapshot.coingecko.change24hPct != null ? `${snapshot.coingecko.change24hPct.toFixed(2)}%` : "—"})`
      : null,
    snapshot.moralis
      ? `- Moralis: ${snapshot.moralis.priceUsd != null ? format(snapshot.moralis.priceUsd) : "—"}${snapshot.moralis.change24hPct != null ? ` (24h ${snapshot.moralis.change24hPct.toFixed(2)}%)` : ""}${snapshot.moralis.exchangeName ? ` via ${snapshot.moralis.exchangeName}` : ""}`
      : null,
    priceSpreadPct != null && priceSpreadPct > 5
      ? `Warning: price discrepancy detected across sources (~${priceSpreadPct.toFixed(2)}%). Use the most recent timestamped source and note that prices vary by venue.`
      : null,
  ];

  if (news && news.length > 0) {
    lines.push("Latest verified headlines:");
    news.slice(0, 4).forEach((headline) => {
      lines.push(
        `- ${headline.title}${headline.source ? ` (${headline.source})` : ""} — published ${new Date(
          headline.publishedAt,
        ).toISOString()} — ${headline.url}`,
      );
    });
  }

  lines.push(
    "In your response, include a concise market summary, highlight the biggest movers and drivers, reference the Pyth chart that is embedded in the UI, and weave in the notable headlines (cite their sources). If you include numeric prices/market-cap/volume in text, verify them against at least two of Pyth/CoinGecko/Moralis; if they materially disagree or data is missing, do a quick web search and cite one external source.",
  );

  return lines.filter((line): line is string => Boolean(line && line.trim().length > 0)).join("\n");
};
