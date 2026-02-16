/**
 * Unit tests for PollingService.
 *
 * Tests the background polling service including task registration,
 * timer management, AppState integration, concurrency control, and
 * error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { AppState } from 'react-native';

import {
  PollingService,
  type PollingServiceConfig,
} from '@infrastructure/wallet/polling-service';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface MockPollingTask {
  readonly id: string;
  readonly intervalMs: number;
  readonly fn: Mock<() => Promise<void>>;
}

function createMockTask(overrides: Partial<MockPollingTask> = {}): MockPollingTask {
  return {
    id: `task-${Math.random().toString(36).slice(2, 9)}`,
    intervalMs: 1000,
    fn: vi.fn(async () => {}),
    ...overrides,
  };
}

function createService(config: PollingServiceConfig = {}): PollingService {
  return new PollingService(config);
}

// ---------------------------------------------------------------------------
// Mock AppState listener tracking
// ---------------------------------------------------------------------------

type AppStateChangeHandler = (state: 'active' | 'background' | 'inactive') => void;

let appStateListeners: AppStateChangeHandler[] = [];
let mockRemove: Mock;

function simulateAppStateChange(newState: 'active' | 'background' | 'inactive'): void {
  for (const listener of appStateListeners) {
    listener(newState);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PollingService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    appStateListeners = [];
    mockRemove = vi.fn();

    // Mock AppState.addEventListener to track listeners
    vi.mocked(AppState.addEventListener).mockImplementation(
      (_type: string, handler: AppStateChangeHandler) => {
        appStateListeners.push(handler);
        return { remove: mockRemove };
      },
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Registration tests
  // -------------------------------------------------------------------------

  describe('register/unregister', () => {
    it('should register a task without starting it', () => {
      const service = createService();
      const task = createMockTask();

      service.register(task);

      expect(service.getTaskCount()).toBe(1);
      expect(service.isRunning()).toBe(false);
      expect(task.fn).not.toHaveBeenCalled();
    });

    it('should allow registering multiple tasks', () => {
      const service = createService();
      const task1 = createMockTask({ id: 'task-1' });
      const task2 = createMockTask({ id: 'task-2' });
      const task3 = createMockTask({ id: 'task-3' });

      service.register(task1);
      service.register(task2);
      service.register(task3);

      expect(service.getTaskCount()).toBe(3);
    });

    it('should replace existing task when registering with same id', () => {
      const service = createService();
      const originalTask = createMockTask({ id: 'my-task', intervalMs: 1000 });
      const replacementTask = createMockTask({ id: 'my-task', intervalMs: 2000 });

      service.register(originalTask);
      service.register(replacementTask);

      expect(service.getTaskCount()).toBe(1);
    });

    it('should unregister a task by id', () => {
      const service = createService();
      const task = createMockTask({ id: 'removable-task' });

      service.register(task);
      expect(service.getTaskCount()).toBe(1);

      service.unregister('removable-task');
      expect(service.getTaskCount()).toBe(0);
    });

    it('should handle unregistering non-existent task gracefully', () => {
      const service = createService();

      // Should not throw
      expect(() => service.unregister('non-existent')).not.toThrow();
    });

    it('should clear timer when unregistering a running task', () => {
      const service = createService();
      const task = createMockTask({ id: 'running-task', intervalMs: 1000 });

      service.register(task);
      service.start();

      // Task should have been called once immediately
      expect(task.fn).toHaveBeenCalledTimes(1);

      // Unregister should stop future calls
      service.unregister('running-task');

      // Advance time - no more calls should happen
      vi.advanceTimersByTime(5000);
      expect(task.fn).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Start/Stop tests
  // -------------------------------------------------------------------------

  describe('start/stop', () => {
    it('should start all registered tasks', async () => {
      const service = createService();
      const task1 = createMockTask({ id: 'task-1', intervalMs: 1000 });
      const task2 = createMockTask({ id: 'task-2', intervalMs: 2000 });

      service.register(task1);
      service.register(task2);
      service.start();

      // Both should be called immediately on start
      await vi.advanceTimersByTimeAsync(0);
      expect(task1.fn).toHaveBeenCalled();
      expect(task2.fn).toHaveBeenCalled();
      expect(service.isRunning()).toBe(true);
    });

    it('should execute task immediately on start', async () => {
      const service = createService();
      const task = createMockTask({ intervalMs: 10000 });

      service.register(task);
      service.start();

      // Should be called immediately, not after interval
      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);
    });

    it('should execute task at configured interval', async () => {
      const service = createService();
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      // Initial call
      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);

      // After 1 second
      await vi.advanceTimersByTimeAsync(1000);
      expect(task.fn).toHaveBeenCalledTimes(2);

      // After another second
      await vi.advanceTimersByTimeAsync(1000);
      expect(task.fn).toHaveBeenCalledTimes(3);
    });

    it('should stop all timers when stopped', async () => {
      const service = createService();
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);

      service.stop();
      expect(service.isRunning()).toBe(false);

      // Advance time - no more calls should happen
      await vi.advanceTimersByTimeAsync(5000);
      expect(task.fn).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent when calling start multiple times', () => {
      const service = createService();
      const task = createMockTask();

      service.register(task);
      service.start();
      service.start();
      service.start();

      // Should only have one timer running
      expect(service.isRunning()).toBe(true);
    });

    it('should be idempotent when calling stop multiple times', () => {
      const service = createService();
      const task = createMockTask();

      service.register(task);
      service.start();
      service.stop();
      service.stop();
      service.stop();

      expect(service.isRunning()).toBe(false);
    });

    it('should subscribe to AppState on start when pauseInBackground is true', () => {
      const service = createService({ pauseInBackground: true });
      const task = createMockTask();

      service.register(task);
      service.start();

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });

    it('should not subscribe to AppState when pauseInBackground is false', () => {
      const service = createService({ pauseInBackground: false });
      const task = createMockTask();

      service.register(task);
      service.start();

      expect(AppState.addEventListener).not.toHaveBeenCalled();
    });

    it('should unsubscribe from AppState on stop', () => {
      const service = createService({ pauseInBackground: true });
      const task = createMockTask();

      service.register(task);
      service.start();
      service.stop();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Pause/Resume tests
  // -------------------------------------------------------------------------

  describe('pause/resume', () => {
    it('should pause all timers without unregistering tasks', async () => {
      const service = createService();
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);

      service.pause();

      // Tasks should still be registered
      expect(service.getTaskCount()).toBe(1);

      // But no more calls should happen
      await vi.advanceTimersByTimeAsync(5000);
      expect(task.fn).toHaveBeenCalledTimes(1);
    });

    it('should resume all tasks after pause', async () => {
      const service = createService();
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);

      service.pause();
      await vi.advanceTimersByTimeAsync(3000);
      expect(task.fn).toHaveBeenCalledTimes(1);

      service.resume();

      // Should be called immediately on resume
      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(2);

      // And continue at interval
      await vi.advanceTimersByTimeAsync(1000);
      expect(task.fn).toHaveBeenCalledTimes(3);
    });

    it('should not resume if service was stopped', async () => {
      const service = createService();
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();
      service.stop();

      service.resume();

      expect(service.isRunning()).toBe(false);
      await vi.advanceTimersByTimeAsync(5000);
      // Only the initial call from start
      expect(task.fn).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // AppState integration tests
  // -------------------------------------------------------------------------

  describe('AppState integration', () => {
    it('should pause when app goes to background', async () => {
      const service = createService({ pauseInBackground: true });
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);

      // Simulate going to background
      simulateAppStateChange('background');

      // No more calls should happen
      await vi.advanceTimersByTimeAsync(5000);
      expect(task.fn).toHaveBeenCalledTimes(1);
    });

    it('should resume when app becomes active', async () => {
      const service = createService({ pauseInBackground: true });
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);

      // Go to background
      simulateAppStateChange('background');
      await vi.advanceTimersByTimeAsync(5000);
      expect(task.fn).toHaveBeenCalledTimes(1);

      // Come back to active
      simulateAppStateChange('active');
      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(2);
    });

    it('should not pause on inactive state', async () => {
      const service = createService({ pauseInBackground: true });
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      await vi.advanceTimersByTimeAsync(0);
      expect(task.fn).toHaveBeenCalledTimes(1);

      // Inactive state (e.g., notification center pulled down) should not pause
      simulateAppStateChange('inactive');
      await vi.advanceTimersByTimeAsync(1000);
      expect(task.fn).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid state changes gracefully', async () => {
      const service = createService({ pauseInBackground: true });
      const task = createMockTask({ intervalMs: 1000 });

      service.register(task);
      service.start();

      await vi.advanceTimersByTimeAsync(0);

      // Rapid state changes
      simulateAppStateChange('background');
      simulateAppStateChange('active');
      simulateAppStateChange('background');
      simulateAppStateChange('active');

      // Should still be working
      await vi.advanceTimersByTimeAsync(1000);
      expect(task.fn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Concurrency tests
  // -------------------------------------------------------------------------

  describe('concurrency guard', () => {
    it('should respect maxConcurrent limit', async () => {
      const service = createService({ maxConcurrent: 2 });
      const resolvers: Array<() => void> = [];

      const createSlowTask = (id: string): MockPollingTask => {
        return {
          id,
          intervalMs: 100,
          fn: vi.fn(
            () =>
              new Promise<void>((resolve) => {
                resolvers.push(resolve);
              }),
          ),
        };
      };

      const task1 = createSlowTask('task-1');
      const task2 = createSlowTask('task-2');
      const task3 = createSlowTask('task-3');

      service.register(task1);
      service.register(task2);
      service.register(task3);
      service.start();

      // Trigger initial execution
      await vi.advanceTimersByTimeAsync(0);

      // Only 2 should be running (maxConcurrent = 2)
      expect(service.getActiveCount()).toBe(2);

      // Resolve one task
      const resolver = resolvers.shift();
      if (resolver) resolver();
      await vi.advanceTimersByTimeAsync(0);

      // Now the third should be able to start
      expect(service.getActiveCount()).toBeLessThanOrEqual(2);
    });

    it('should skip poll tick if at max concurrent', async () => {
      const service = createService({ maxConcurrent: 1 });
      const resolveQueue: Array<() => void> = [];

      const slowTask: MockPollingTask = {
        id: 'slow-task',
        intervalMs: 100,
        fn: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveQueue.push(resolve);
            }),
        ),
      };

      service.register(slowTask);
      service.start();

      // First execution starts
      await vi.advanceTimersByTimeAsync(0);
      expect(slowTask.fn).toHaveBeenCalledTimes(1);
      expect(service.getActiveCount()).toBe(1);

      // Next interval tick - should skip because task is still running
      await vi.advanceTimersByTimeAsync(100);
      expect(slowTask.fn).toHaveBeenCalledTimes(1); // Still 1

      // Resolve the task
      const resolver = resolveQueue.shift();
      expect(resolver).toBeDefined();
      resolver!();
      await vi.advanceTimersByTimeAsync(0);

      // Now next tick should execute
      await vi.advanceTimersByTimeAsync(100);
      expect(slowTask.fn).toHaveBeenCalledTimes(2);
    });

    it('should use default maxConcurrent of 3', () => {
      const service = createService();
      // Access private field for testing - use type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((service as any).maxConcurrent).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling tests
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('should not crash when task throws synchronous error', async () => {
      const service = createService();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const errorTask: MockPollingTask = {
        id: 'error-task',
        intervalMs: 1000,
        fn: vi.fn(async () => {
          throw new Error('Task failed!');
        }),
      };

      service.register(errorTask);
      service.start();

      // Should not throw
      await vi.advanceTimersByTimeAsync(0);
      expect(service.isRunning()).toBe(true);

      // Should log the error
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PollingService]'),
        expect.stringContaining('Task failed!'),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should continue polling after task error', async () => {
      const service = createService();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      let callCount = 0;
      const flakeyTask: MockPollingTask = {
        id: 'flakey-task',
        intervalMs: 1000,
        fn: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First call fails');
          }
        }),
      };

      service.register(flakeyTask);
      service.start();

      // First call - fails
      await vi.advanceTimersByTimeAsync(0);
      expect(callCount).toBe(1);

      // Second call - succeeds
      await vi.advanceTimersByTimeAsync(1000);
      expect(callCount).toBe(2);

      // Service still running
      expect(service.isRunning()).toBe(true);
    });

    it('should decrement activeCount even when task fails', async () => {
      const service = createService();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const errorTask: MockPollingTask = {
        id: 'error-task',
        intervalMs: 1000,
        fn: vi.fn(async () => {
          throw new Error('Failed');
        }),
      };

      service.register(errorTask);
      service.start();

      // Execute the task and let the promise settle
      await vi.advanceTimersByTimeAsync(0);

      // Give the async error handling time to complete
      await Promise.resolve();
      await Promise.resolve();

      // Active count should be back to 0
      expect(service.getActiveCount()).toBe(0);
    });

    it('should handle non-Error thrown values', async () => {
      const service = createService();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const weirdErrorTask: MockPollingTask = {
        id: 'weird-error-task',
        intervalMs: 1000,
        fn: vi.fn(async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'string error';
        }),
      };

      service.register(weirdErrorTask);
      service.start();

      await vi.advanceTimersByTimeAsync(0);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PollingService]'),
        'string error',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Dynamic task registration tests
  // -------------------------------------------------------------------------

  describe('dynamic task registration', () => {
    it('should start new task immediately when registered while running', async () => {
      const service = createService();
      const task1 = createMockTask({ id: 'task-1', intervalMs: 1000 });

      service.register(task1);
      service.start();

      await vi.advanceTimersByTimeAsync(0);
      expect(task1.fn).toHaveBeenCalledTimes(1);

      // Register new task while running
      const task2 = createMockTask({ id: 'task-2', intervalMs: 1000 });
      service.register(task2);

      // Should be called immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(task2.fn).toHaveBeenCalledTimes(1);
    });

    it('should not start task when registered while stopped', () => {
      const service = createService();
      const task = createMockTask();

      service.register(task);

      expect(task.fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(5000);
      expect(task.fn).not.toHaveBeenCalled();
    });
  });
});
