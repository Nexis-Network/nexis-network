"use client";

import type { AssetTick } from "@/lib/utils/asset-normalization";
import type { ChartTimeframe } from "@/server/actions/market-data";
import { TokenPriceChart } from "@/components/assets/token-price-chart";
import { AssetPageHeader } from "./asset-page-header";
import type { AssetChartType } from "./asset-page.types";

interface AssetPageOverviewProps {
  asset: AssetTick;
  price: number;
  change24h: number;
  historyData: [number, number][];
  timeframe: ChartTimeframe;
  interval: string;
  chartType: AssetChartType;
  highPrice: number;
  lowPrice: number;
  formattedMarketCap: string;
  formattedVolume24h: string;
  onChartTypeChange: (value: AssetChartType) => void;
  onIntervalChange: (value: string) => void;
  onTimeframeChange: (value: ChartTimeframe) => void;
}

export function AssetPageOverview({
  asset,
  price,
  change24h,
  historyData,
  timeframe,
  interval,
  chartType,
  highPrice,
  lowPrice,
  formattedMarketCap,
  formattedVolume24h,
  onChartTypeChange,
  onIntervalChange,
  onTimeframeChange,
}: AssetPageOverviewProps) {
  return (
    <div className="flex flex-col gap-10 w-full animate-in fade-in duration-500">
      <AssetPageHeader
        asset={asset}
        price={price}
        change24h={change24h}
        timeframe={timeframe}
        interval={interval}
        chartType={chartType}
        formattedMarketCap={formattedMarketCap}
        onChartTypeChange={onChartTypeChange}
        onIntervalChange={onIntervalChange}
        onTimeframeChange={onTimeframeChange}
      />

      <div className="h-[450px] w-full bg-transparent overflow-hidden relative group">
        <TokenPriceChart initialData={historyData} type={chartType} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 pt-4 pb-8 min-h-[43px]">
        <AssetStat label="Market Cap" value={`$${formattedMarketCap.replace("$", "")}`} />
        <AssetStat label="1D Volume" value={`$${formattedVolume24h.replace("$", "")}`} />
        <AssetStat
          label={`High (${timeframe})`}
          value={`$${highPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })}`}
        />
        <AssetStat
          label={`Low (${timeframe})`}
          value={`$${lowPrice.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })}`}
          align="end"
        />
      </div>
    </div>
  );
}

function AssetStat({
  label,
  value,
  align = "start",
}: {
  label: string;
  value: string;
  align?: "start" | "end";
}) {
  return (
    <div
      className={
        align === "end"
          ? "flex flex-col gap-[6px] items-end"
          : "flex flex-col gap-[6px] items-start"
      }
    >
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
      <span className="text-[15px] font-mono font-normal text-foreground tracking-tight">
        {value}
      </span>
    </div>
  );
}
