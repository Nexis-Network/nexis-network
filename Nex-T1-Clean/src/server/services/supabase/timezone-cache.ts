/**
 * Timezone Cache
 * 
 * Caches timezone names to avoid repeated pg_timezone_names queries
 * which were causing 0% cache hit rate and 57ms mean query time.
 * 
 * Uses Supabase materialized view: app_private.cached_timezone_names
 */

import { createClient } from '@/server/services/supabase/server';


import { logger } from '@/lib/logger';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
let cachedTimezones: string[] | null = null;
let cacheTimestamp: number = 0;

/**
 * Get all timezone names from cached materialized view
 * Falls back to direct query if cache is unavailable
 */
export async function getTimezoneNames(): Promise<string[]> {
  // Check in-memory cache first
  const now = Date.now();
  if (cachedTimezones && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedTimezones;
  }

  try {
    const supabase = await createClient();
    
    if (!supabase) {
      logger.warn('[TimezoneCache] Supabase client not available, using fallback');
      return getTimezoneNamesFallback();
    }
    
    // Query cached materialized view via RPC function
    const { data, error } = await supabase.rpc('get_timezone_names');

    if (error) {
      logger.warn('[TimezoneCache] Failed to fetch from materialized view:', error);
      // Fallback to direct query (should be rare)
      return getTimezoneNamesFallback();
    }

    const timezones = Array.isArray(data) ? data : [];
    
    // Update in-memory cache
    cachedTimezones = timezones;
    cacheTimestamp = now;
    
    return timezones;
  } catch (error) {
    logger.error('[TimezoneCache] Error fetching timezones:', error);
    return getTimezoneNamesFallback();
  }
}

/**
 * Fallback: Direct query to pg_timezone_names
 * Should only be used if materialized view is unavailable
 */
async function getTimezoneNamesFallback(): Promise<string[]> {
  const supabase = await createClient();
  
  if (!supabase) {
    // Last resort: return common timezones when Supabase is unavailable
    logger.warn('[TimezoneCache] Supabase client not available in fallback, returning common timezones');
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
    ];
  }
  
  const { data, error } = await supabase.rpc('get_timezone_names_fallback');
  
  if (error) {
    // Last resort: return common timezones
    logger.error('[TimezoneCache] Fallback query failed:', error);
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
    ];
  }
  
  return data || [];
}

/**
 * Clear in-memory cache (useful for testing or forced refresh)
 */
export function clearTimezoneCache(): void {
  cachedTimezones = null;
  cacheTimestamp = 0;
}

/**
 * Get timezone names synchronously from cache
 * Returns empty array if cache not populated
 */
export function getTimezoneNamesSync(): string[] {
  return cachedTimezones || [];
}

