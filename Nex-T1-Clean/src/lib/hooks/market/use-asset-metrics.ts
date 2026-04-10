"use client";

import { useQuery } from "@tanstack/react-query";
import * as MarketData from "@/server/actions/market-data";

export function useAssetSecurity(chainId: string | number, address: string, enabled: boolean = true) {
  const resolvedChain = String(chainId || "1");
  return useQuery({
    queryKey: ["asset-security", resolvedChain, address],
    queryFn: () => MarketData.getAssetSecurity(resolvedChain, address),
    enabled: Boolean(address) && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAssetTradeData(chainId: string | number, address: string, enabled: boolean = true) {
  const resolvedChain = String(chainId || "1");
  return useQuery({
    queryKey: ["asset-trade-data", resolvedChain, address],
    queryFn: () => MarketData.getAssetTradeData(resolvedChain, address),
    enabled: Boolean(address) && enabled,
    staleTime: 5 * 60 * 1000, 
  });
}

export function useAssetHolders(chainId: string | number, address: string, enabled: boolean = true) {
  const resolvedChain = String(chainId || "1");
  return useQuery({
    queryKey: ["asset-holders", resolvedChain, address],
    queryFn: () => MarketData.getAssetHolders(resolvedChain, address),
    enabled: Boolean(address) && enabled,
    staleTime: 15 * 60 * 1000, // 15 mins for holders
  });
}

export function useAssetPairs(chainId: string | number, address: string, enabled: boolean = true) {
  const resolvedChain = String(chainId || "1");
  return useQuery({
    queryKey: ["asset-pairs", resolvedChain, address],
    queryFn: () => MarketData.getAssetPairs(resolvedChain, address),
    enabled: Boolean(address) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssetTransactions(chainId: string | number, address: string, page: number = 1, limit: number = 20, enabled: boolean = true) {
  const resolvedChain = String(chainId || "1");
  return useQuery({
    queryKey: ["asset-transactions", resolvedChain, address, page, limit],
    queryFn: () => MarketData.getAssetTransactions(resolvedChain, address, page, limit),
    enabled: Boolean(address) && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useAssetVesting(symbol: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["asset-vesting", symbol],
    queryFn: () => MarketData.getAssetVesting(symbol),
    enabled: Boolean(symbol) && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour 
  });
}

export function useAssetFunding(symbol: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["asset-funding", symbol],
    queryFn: () => MarketData.getAssetFunding(symbol),
    enabled: Boolean(symbol) && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useAssetSales(symbol: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["asset-sales", symbol],
    queryFn: () => MarketData.getAssetSales(symbol),
    enabled: Boolean(symbol) && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useAssetHistory(
  chainId: string | number, 
  address: string, 
  timeframe: MarketData.ChartTimeframe, 
  type: "price" | "volume" | "tvl" = "price", 
  interval: string = "hourly",
  initialData?: [number, number][]
) {
  const resolvedChain = String(chainId || "1");
  return useQuery({
    queryKey: ["asset-history", resolvedChain, address, timeframe, type, interval],
    queryFn: () => MarketData.getTokenHistory(resolvedChain, address, timeframe, type, interval),
    enabled: Boolean(address),
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData
  });
}
