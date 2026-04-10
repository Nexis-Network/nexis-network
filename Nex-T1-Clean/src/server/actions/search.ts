'use server';

import { birdeyeFetch } from '@/lib/birdeye/client';
import { SearchResponse } from '@/types/birdeye';


import { logger } from '@/lib/logger';
export async function searchBirdeye(query: string) {
  if (!query) return { items: [] };

  try {
    // Endpoint: /defi/v3/search
    // Params: keyword, chain (optional)
    // We'll search across solana for now or default chain
    const response = await birdeyeFetch<SearchResponse>(`search?keyword=${encodeURIComponent(query)}&chain=solana`, {
        version: 'defi/v3'
    });
    return response;
  } catch (error) {
    logger.error('Search failed', error);
    return { items: [] };
  }
}
