/**
 * Background polling service for coordinating periodic data refreshes.
 *
 * Manages multiple polling tasks with configurable intervals, automatic
 * pause/resume on app state changes, and concurrency limiting.
 *
 * @module infrastructure/wallet/polling-service
 */

import { AppState, type AppStateStatus } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A polling task that will be executed at regular intervals.
 */
export interface PollingTask {
  /** Unique identifier for this task. */
  readonly id: string;
  /** Polling interval in milliseconds. */
  readonly intervalMs: number;
  /** The async function to execute on each poll tick. */
  readonly fn: () => Promise<void>;
}

/**
 * Configuration options for the polling service.
 */
export interface PollingServiceConfig {
  /** Pause polling when app goes to background. Default: true */
  readonly pauseInBackground?: boolean;
  /** Maximum concurrent poll operations. Default: 3 */
  readonly maxConcurrent?: number;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface InternalPollingTask extends PollingTask {
  /** Track if this specific task is currently executing. */
  isExecuting: boolean;
}

type AppStateSubscription = ReturnType<typeof AppState.addEventListener>;

// ---------------------------------------------------------------------------
// PollingService
// ---------------------------------------------------------------------------

/**
 * A generic, configurable polling manager that coordinates background data
 * refreshes with AppState awareness and concurrency control.
 *
 * @example
 * ```ts
 * pollingService.register({
 *   id: 'balance-refresh',
 *   intervalMs: 15_000,
 *   fn: async () => { await fetchBalances(); }
 * });
 * pollingService.start();
 * ```
 */
export class PollingService {
  private readonly tasks: Map<string, InternalPollingTask> = new Map();
  private readonly timers: Map<string, ReturnType<typeof setInterval>> =
    new Map();
  private readonly pauseInBackground: boolean;
  private readonly maxConcurrent: number;

  private running: boolean = false;
  private activeCount: number = 0;
  private appStateSubscription: AppStateSubscription | null = null;
  private lastAppState: AppStateStatus = AppState.currentState;

  constructor(config: PollingServiceConfig = {}) {
    this.pauseInBackground = config.pauseInBackground ?? true;
    this.maxConcurrent = config.maxConcurrent ?? 3;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Register a polling task. Does NOT start the task automatically.
   * Call `start()` to begin polling all registered tasks.
   *
   * @param task - The polling task to register.
   */
  register(task: PollingTask): void {
    if (this.tasks.has(task.id)) {
      // Task already registered; update it
      this.unregister(task.id);
    }

    const internalTask: InternalPollingTask = {
      ...task,
      isExecuting: false,
    };

    this.tasks.set(task.id, internalTask);

    // If service is already running, start this task's timer immediately
    if (this.running) {
      this.startTaskTimer(internalTask);
    }
  }

  /**
   * Unregister a polling task and clear its timer if active.
   *
   * @param taskId - The unique ID of the task to remove.
   */
  unregister(taskId: string): void {
    this.clearTaskTimer(taskId);
    this.tasks.delete(taskId);
  }

  /**
   * Start all registered tasks and subscribe to AppState changes.
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    // Subscribe to app state changes if configured
    if (this.pauseInBackground) {
      this.subscribeToAppState();
    }

    // Start timers for all registered tasks
    for (const task of this.tasks.values()) {
      this.startTaskTimer(task);
    }
  }

  /**
   * Stop all timers and unsubscribe from AppState.
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Clear all timers
    for (const taskId of this.timers.keys()) {
      this.clearTaskTimer(taskId);
    }

    // Unsubscribe from app state
    this.unsubscribeFromAppState();
  }

  /**
   * Pause all timers but keep tasks registered.
   * Useful for temporarily suspending polling without losing task configuration.
   */
  pause(): void {
    for (const taskId of this.timers.keys()) {
      this.clearTaskTimer(taskId);
    }
  }

  /**
   * Resume all registered tasks after a pause.
   */
  resume(): void {
    if (!this.running) {
      return;
    }

    for (const task of this.tasks.values()) {
      // Only start if timer doesn't already exist
      if (!this.timers.has(task.id)) {
        this.startTaskTimer(task);
      }
    }
  }

  /**
   * Check if the service is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the number of currently registered tasks.
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * Get the current number of active (executing) polls.
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private startTaskTimer(task: InternalPollingTask): void {
    // Clear existing timer if any
    this.clearTaskTimer(task.id);

    // Execute immediately on start, then at interval
    void this.executePoll(task);

    const timer = setInterval(() => {
      void this.executePoll(task);
    }, task.intervalMs);

    this.timers.set(task.id, timer);
  }

  private clearTaskTimer(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer !== undefined) {
      clearInterval(timer);
      this.timers.delete(taskId);
    }
  }

  private async executePoll(task: InternalPollingTask): Promise<void> {
    // Concurrency guard: skip if at max concurrent polls
    if (this.activeCount >= this.maxConcurrent) {
      return;
    }

    // Skip if this specific task is already executing
    if (task.isExecuting) {
      return;
    }

    task.isExecuting = true;
    this.activeCount++;

    try {
      await task.fn();
    } catch (error) {
      // Log error but never crash the service
      console.warn(
        `[PollingService] Task "${task.id}" failed:`,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      task.isExecuting = false;
      this.activeCount--;
    }
  }

  private subscribeToAppState(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  private unsubscribeFromAppState(): void {
    if (this.appStateSubscription !== null) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private readonly handleAppStateChange = (nextState: AppStateStatus): void => {
    const prevState = this.lastAppState;
    this.lastAppState = nextState;

    // Pause when going to background
    if (prevState === 'active' && nextState === 'background') {
      this.pause();
      return;
    }

    // Resume when coming back to active
    if (prevState !== 'active' && nextState === 'active') {
      this.resume();
    }
  };
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Default polling service instance configured for typical wallet app usage.
 */
export const pollingService = new PollingService({
  pauseInBackground: true,
  maxConcurrent: 3,
});
