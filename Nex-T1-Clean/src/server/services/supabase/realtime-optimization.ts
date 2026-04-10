/**
 * Realtime Optimization Utilities
 * 
 * Addresses Realtime query performance issues:
 * - realtime.list_changes queries account for 74% of total query time
 * - High-frequency polling from Realtime subscriptions
 * 
 * Best practices:
 * 1. Reuse channels where possible
 * 2. Clean up channels on unmount
 * 3. Use broadcast channels instead of postgres_changes where appropriate
 * 4. Batch subscriptions when possible
 */

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/**
 * Channel manager to prevent duplicate subscriptions
 */
class RealtimeChannelManager {
  private channels = new Map<string, RealtimeChannel>();
  private subscriptionCounts = new Map<string, number>();

  /**
   * Get or create a channel with reference counting
   */
  getChannel(
    supabase: SupabaseClient,
    channelName: string,
    config?: { private?: boolean }
  ): RealtimeChannel {
    const existing = this.channels.get(channelName);
    if (existing) {
      // Increment reference count
      const count = this.subscriptionCounts.get(channelName) || 0;
      this.subscriptionCounts.set(channelName, count + 1);
      return existing;
    }

    // Create new channel
    // RealtimeChannelOptions requires a config property
    const channelOptions = config 
      ? { config: { private: config.private } }
      : { config: {} };
    const channel = supabase.channel(channelName, channelOptions);
    this.channels.set(channelName, channel);
    this.subscriptionCounts.set(channelName, 1);
    return channel;
  }

  /**
   * Remove channel reference (cleanup when count reaches 0)
   */
  removeChannel(channelName: string): void {
    const count = this.subscriptionCounts.get(channelName) || 0;
    if (count <= 1) {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(channelName);
        this.subscriptionCounts.delete(channelName);
      }
    } else {
      // Decrement reference count
      this.subscriptionCounts.set(channelName, count - 1);
    }
  }

  /**
   * Get all active channels (for monitoring)
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Cleanup all channels
   */
  cleanup(): void {
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    this.subscriptionCounts.clear();
  }
}

// Global channel manager instance
const channelManager = new RealtimeChannelManager();

/**
 * Get optimized Realtime channel with automatic cleanup
 */
export function getOptimizedChannel(
  supabase: SupabaseClient,
  channelName: string,
  config?: { private?: boolean }
): RealtimeChannel {
  return channelManager.getChannel(supabase, channelName, config);
}

/**
 * Remove channel reference (call in cleanup/useEffect return)
 */
export function removeOptimizedChannel(channelName: string): void {
  channelManager.removeChannel(channelName);
}

/**
 * Get active channel count (for monitoring)
 */
export function getActiveChannelCount(): number {
  return channelManager.getActiveChannels().length;
}

/**
 * Cleanup all channels (use sparingly, e.g., on app shutdown)
 */
export function cleanupAllChannels(): void {
  channelManager.cleanup();
}

/**
 * Realtime subscription configuration
 */
export interface RealtimeSubscriptionConfig {
  /**
   * Use broadcast instead of postgres_changes when possible
   * Broadcast is more efficient for custom events
   */
  preferBroadcast?: boolean;
  
  /**
   * Debounce interval for high-frequency updates (ms)
   */
  debounceMs?: number;
  
  /**
   * Maximum number of concurrent subscriptions per user
   */
  maxSubscriptions?: number;
}

/**
 * Create optimized Realtime subscription
 */
export function createOptimizedSubscription(
  supabase: SupabaseClient,
  channelName: string,
  config?: RealtimeSubscriptionConfig
): RealtimeChannel {
  const channel = getOptimizedChannel(supabase, channelName, { private: true });
  
  // Apply debouncing if configured
  if (config?.debounceMs) {
    // Note: Debouncing should be implemented at the handler level
    // This is just a placeholder for the pattern
  }
  
  return channel;
}

