"use client";

import { useState } from "react";
import Image from "next/image";
import { Activity, CandlestickChart, Check, ChevronDown, Copy } from "lucide-react";

import type { AssetTick } from "@/lib/utils/asset-normalization";
import type { ChartTimeframe } from "@/server/actions/market-data";
import { AssetPriceDisplay, AssetChangeDisplay } from "@/components/assets/asset-metrics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ASSET_PAGE_INTERVALS, ASSET_PAGE_TIMEFRAMES } from "./asset-page.constants";
import type { AssetChartType } from "./asset-page.types";
import {
  resolveAssetChainLabel,
  truncateAddress,
} from "@/components/assets/asset-client-view/asset-page.utils";

interface AssetPageHeaderProps {
  asset: AssetTick;
  price: number;
  change24h: number;
  timeframe: ChartTimeframe;
  interval: string;
  chartType: AssetChartType;
  formattedMarketCap: string;
  onChartTypeChange: (value: AssetChartType) => void;
  onIntervalChange: (value: string) => void;
  onTimeframeChange: (value: ChartTimeframe) => void;
}

export function AssetPageHeader({
  asset,
  price,
  change24h,
  timeframe,
  interval,
  chartType,
  formattedMarketCap,
  onChartTypeChange,
  onIntervalChange,
  onTimeframeChange,
}: AssetPageHeaderProps) {
  const [copied, setCopied] = useState(false);
  const chainLabel = resolveAssetChainLabel(asset);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(asset.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="w-[58px] h-[58px] rounded-full overflow-hidden bg-card border border-border/60 flex-shrink-0">
          {asset.logoUrl ? (
            <Image
              src={asset.logoUrl}
              alt={asset.symbol}
              width={58}
              height={58}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/40 text-foreground font-bold text-xl">
              {asset.symbol[0]}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4 h-8">
            <h1 className="text-[19.2px] leading-[30px] font-normal text-foreground">
              {asset.name}
            </h1>
            <div className="w-[2px] h-6 bg-border/60" />
            <span className="text-[19.7px] leading-[30px] font-normal text-muted-foreground">
              {asset.symbol}
            </span>
          </div>

          <div className="flex items-center gap-2 h-[18px] flex-wrap">
            <div className="flex items-center px-[6px] py-[4px] bg-muted/40 border border-border/60 rounded-[4px] h-5">
              <span className="text-[10.9px] leading-[18px] uppercase text-foreground font-normal">
                Token
              </span>
            </div>

            <div className="flex items-center gap-[4.5px] px-[6px] py-[4px] bg-muted/40 border border-border/60 rounded-[4px] h-5">
              <div className="w-[10px] h-[10px] relative">
                <div className="absolute inset-0 m-auto w-[6px] h-[6px] rounded-full bg-foreground" />
              </div>
              <span className="text-[10.9px] leading-[18px] uppercase text-foreground font-normal">
                {chainLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyAddress}
              className="flex items-center gap-1 px-[8px] py-[6px] bg-muted/40 border border-border/60 rounded-[4px] cursor-pointer hover:bg-accent transition-colors"
            >
              <span className="text-[10.9px] leading-[18px] uppercase text-foreground font-normal">
                {truncateAddress(asset.address)}
              </span>
              {copied ? (
                <Check className="w-[10px] h-[10px] text-emerald-500" />
              ) : (
                <Copy className="w-[10px] h-[10px] text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 min-h-10">
        <div className="flex items-center gap-4 flex-wrap">
          <AssetPriceDisplay
            symbol={asset.symbol}
            chainId={asset.chainId || "1"}
            address={asset.address}
            priceOverride={price}
            className="text-[32px] font-mono font-normal leading-[40px] text-foreground"
          />
          <AssetChangeDisplay
            symbol={asset.symbol}
            chainId={asset.chainId || "1"}
            address={asset.address}
            changeOverride={change24h}
          />

          <div className="hidden lg:flex items-center gap-2 text-[13px] text-muted-foreground ml-2 font-mono font-normal">
            <span>MCAP: {formattedMarketCap}</span>
            <span className="w-[1px] h-3 bg-border/60" />
            <span>
              {new Date().toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between px-3 h-8 bg-muted/40 border border-border/60 rounded-[6px] min-w-[124px] hover:border-border transition-colors">
                <span className="text-[13px] text-muted-foreground">
                  Timeframe:
                  <span className="text-foreground font-medium ml-1">{timeframe}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {ASSET_PAGE_TIMEFRAMES.map((item) => (
                <DropdownMenuItem
                  key={item}
                  onClick={() => onTimeframeChange(item)}
                  className="cursor-pointer rounded-xl"
                >
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between px-3 h-8 bg-muted/40 border border-border/60 rounded-[6px] min-w-[114px] hover:border-border transition-colors">
                <span className="text-[13px] text-muted-foreground">
                  Interval:
                  <span className="text-foreground font-medium ml-1">{interval}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {ASSET_PAGE_INTERVALS.map((item) => (
                <DropdownMenuItem
                  key={item}
                  onClick={() => onIntervalChange(item)}
                  className="cursor-pointer rounded-xl"
                >
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-[1px] h-5 bg-border/60 mx-1" />

          <button
            type="button"
            onClick={() => onChartTypeChange("price")}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-[4px] text-muted-foreground transition-colors",
              chartType === "price" ? "bg-muted/60 text-foreground" : "hover:text-foreground",
            )}
          >
            <Activity className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => onChartTypeChange("volume")}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-[4px] text-muted-foreground transition-colors",
              chartType === "volume" ? "bg-muted/60 text-foreground" : "hover:text-foreground",
            )}
          >
            <CandlestickChart className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
