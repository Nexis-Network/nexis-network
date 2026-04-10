import { invokeCryptorankEndpoint } from "./index";


import { logger } from '@/lib/logger';
/**
 * Helper to find a currency ID by symbol or address.
 * Currently uses search, but could be enhanced with mapping if needed.
 */
export async function getCryptorankCurrencyId(symbol: string): Promise<number | null> {
  try {
    const result = await invokeCryptorankEndpoint({
      endpoint: "currencies_search",
      params: {
        query: symbol,
        limit: 5, // Fetch a few to find exact match
      },
    });

    if (!result.response.ok || !Array.isArray(result.response.data)) {
      return null;
    }

    // Find exact symbol match (case-insensitive)
    const match = (result.response.data as UntypedJson[]).find(
      (c) => c.symbol.toLowerCase() === symbol.toLowerCase()
    );

    return match ? match.id : null;
  } catch (error) {
    logger.error(`Failed to find Cryptorank ID for symbol ${symbol}:`, error);
    return null;
  }
}

export type VestingData = {
  id: string;
  ticker: string;
  name: string;
  totalLimit?: number;
  unlocked?: number;
  unlockedPercent?: number;
  nextUnlock?: {
    date: string;
    amount: number;
    percent: number;
  };
};

export type VestingChartItem = {
  date: string;
  amount: number;
  category: string;
};

export async function getAssetVestingData(currencyId: number) {
  try {
    const result = await invokeCryptorankEndpoint({
      endpoint: "currencies_by_id_vesting",
      params: { id: currencyId },
    });

    if (!result.response.ok) return null;
    return result.response.data;
  } catch (error) {
    logger.error(`Failed to fetch vesting data for ${currencyId}:`, error);
    return null;
  }
}

export async function getAssetVestingChart(currencyId: number): Promise<UntypedJson[]> {
  try {
    const result = await invokeCryptorankEndpoint({
      endpoint: "currencies_by_id_vesting_chart",
      params: { id: currencyId },
    });

    if (!result.response.ok) return [];
    return result.response.data as UntypedJson[];
  } catch (error) {
    logger.error(`Failed to fetch vesting chart for ${currencyId}:`, error);
    return [];
  }
}

export async function getAssetFundingRounds(currencyId: number): Promise<UntypedJson[]> {
  try {
    const result = await invokeCryptorankEndpoint({
      endpoint: "currencies_by_id_funding_rounds",
      params: { id: currencyId },
    });

    if (!result.response.ok) return [];
    return result.response.data as UntypedJson[];
  } catch (error) {
    logger.error(`Failed to fetch funding rounds for ${currencyId}:`, error);
    return [];
  }
}

export async function getAssetPublicSales(currencyId: number): Promise<UntypedJson[]> {
  try {
    const result = await invokeCryptorankEndpoint({
      endpoint: "currencies_by_id_public_sales",
      params: { id: currencyId },
    });

    if (!result.response.ok) return [];
    return result.response.data as UntypedJson[];
  } catch (error) {
    logger.error(`Failed to fetch public sales for ${currencyId}:`, error);
    return [];
  }
}
