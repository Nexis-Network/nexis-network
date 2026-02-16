/**
 * React hooks for background data refresh using the polling service.
 *
 * Provides declarative hooks to register/unregister polling tasks with
 * automatic lifecycle management and React Query integration.
 *
 * @module application/hooks/use-background-refresh
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  pollingService,
  type PollingTask,
} from '@infrastructure/wallet/polling-service';
import type { ChainType } from '@domain/wallet/entities/wallet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for the wallet polling hook.
 */
export interface UseWalletPollingOptions {
  /** The wallet address to poll data for. */
  readonly address: string | undefined;
  /** The blockchain type (evm, solana, etc.). */
  readonly chainType: ChainType;
  /** The numeric chain ID (for EVM chains). */
  readonly chainId: number | string | undefined;
  /** Whether polling should be enabled. Default: true */
  readonly enabled?: boolean;
}

/**
 * Polling interval constants (in milliseconds).
 */
const POLLING_INTERVALS = {
  BALANCE: 15_000, // 15 seconds
  TOKENS: 30_000, // 30 seconds
  PRICES: 30_000, // 30 seconds
} as const;

// ---------------------------------------------------------------------------
// useBackgroundRefresh
// ---------------------------------------------------------------------------

/**
 * Generic hook for managing background polling tasks.
 *
 * Registers tasks on mount, handles cleanup on unmount, and diffs task
 * arrays to efficiently manage task registration when dependencies change.
 *
 * @param tasks - Array of polling tasks to manage.
 *
 * @example
 * ```ts
 * const tasks: PollingTask[] = useMemo(() => [
 *   {
 *     id: 'my-task',
 *     intervalMs: 10_000,
 *     fn: async () => { await doSomething(); }
 *   }
 * ], [dependency]);
 *
 * useBackgroundRefresh(tasks);
 * ```
 */
export function useBackgroundRefresh(
  tasks: ReadonlyArray<PollingTask>,
): void {
  // Track registered task IDs for cleanup
  const registeredTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentTaskIds = new Set(tasks.map((t) => t.id));
    const previousTaskIds = registeredTaskIdsRef.current;

    // Find tasks to unregister (were registered but not in current list)
    for (const taskId of previousTaskIds) {
      if (!currentTaskIds.has(taskId)) {
        pollingService.unregister(taskId);
        previousTaskIds.delete(taskId);
      }
    }

    // Register new or updated tasks
    for (const task of tasks) {
      pollingService.register(task);
      previousTaskIds.add(task.id);
    }

    // Start the service if not already running and we have tasks
    if (tasks.length > 0 && !pollingService.isRunning()) {
      pollingService.start();
    }

    // Cleanup: unregister all tasks managed by this hook instance
    return () => {
      for (const taskId of registeredTaskIdsRef.current) {
        pollingService.unregister(taskId);
      }
      registeredTaskIdsRef.current.clear();
    };
  }, [tasks]);
}

// ---------------------------------------------------------------------------
// useWalletPolling
// ---------------------------------------------------------------------------

/**
 * Convenience hook for standard wallet polling tasks.
 *
 * Automatically sets up polling for:
 * - Wallet balance (every 15 seconds)
 * - Token balances (every 30 seconds)
 * - Token prices (every 30 seconds)
 *
 * @param options - Configuration for wallet polling.
 *
 * @example
 * ```ts
 * useWalletPolling({
 *   address: wallet?.address,
 *   chainType: 'evm',
 *   chainId: 1,
 *   enabled: isWalletConnected,
 * });
 * ```
 */
export function useWalletPolling(options: UseWalletPollingOptions): void {
  const { address, chainType, chainId, enabled = true } = options;
  const queryClient = useQueryClient();

  // Memoize the invalidation functions to prevent unnecessary re-renders
  const invalidateBalance = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['wallet-balance', chainType, chainId, address],
    });
  }, [queryClient, chainType, chainId, address]);

  const invalidateTokens = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['token-balances', chainType, chainId, address],
    });
  }, [queryClient, chainType, chainId, address]);

  const invalidatePrices = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['token-prices'],
    });
  }, [queryClient]);

  // Build the tasks array based on enabled state and address
  const tasks = useMemo<ReadonlyArray<PollingTask>>(() => {
    if (!enabled || !address) {
      return [];
    }

    return [
      {
        id: `balance-refresh-${chainType}-${chainId ?? 'default'}-${address}`,
        intervalMs: POLLING_INTERVALS.BALANCE,
        fn: invalidateBalance,
      },
      {
        id: `token-refresh-${chainType}-${chainId ?? 'default'}-${address}`,
        intervalMs: POLLING_INTERVALS.TOKENS,
        fn: invalidateTokens,
      },
      {
        id: `price-refresh-global`,
        intervalMs: POLLING_INTERVALS.PRICES,
        fn: invalidatePrices,
      },
    ];
  }, [
    enabled,
    address,
    chainType,
    chainId,
    invalidateBalance,
    invalidateTokens,
    invalidatePrices,
  ]);

  useBackgroundRefresh(tasks);
}

// ---------------------------------------------------------------------------
// Additional utility hooks
// ---------------------------------------------------------------------------

/**
 * Hook to create a single custom polling task with automatic lifecycle management.
 *
 * @param taskId - Unique identifier for the task.
 * @param intervalMs - Polling interval in milliseconds.
 * @param fn - The async function to execute on each poll.
 * @param enabled - Whether the task should be active.
 *
 * @example
 * ```ts
 * usePollingTask(
 *   'custom-refresh',
 *   10_000,
 *   async () => { await fetchCustomData(); },
 *   isEnabled,
 * );
 * ```
 */
export function usePollingTask(
  taskId: string,
  intervalMs: number,
  fn: () => Promise<void>,
  enabled: boolean = true,
): void {
  // Stabilize the fn reference
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const tasks = useMemo<ReadonlyArray<PollingTask>>(() => {
    if (!enabled) {
      return [];
    }

    return [
      {
        id: taskId,
        intervalMs,
        fn: async () => {
          await fnRef.current();
        },
      },
    ];
  }, [taskId, intervalMs, enabled]);

  useBackgroundRefresh(tasks);
}
