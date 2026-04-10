/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetSharedRealtimeSubscriptionsForTests,
  deferRealtimeSubscriptionStart,
  retainSharedRealtimeSubscription,
} from "./shared-realtime";

describe("shared realtime subscriptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetSharedRealtimeSubscriptionsForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetSharedRealtimeSubscriptionsForTests();
  });

  it("shares a single underlying subscription across listeners", () => {
    const startMock = vi.fn<(notify: () => void) => () => void>();
    const cleanupMock = vi.fn();
    const state: { notify: (() => void) | null } = { notify: null };

    startMock.mockImplementation((callback) => {
      state.notify = callback;
      return cleanupMock;
    });

    const listenerOne = vi.fn();
    const listenerTwo = vi.fn();

    const releaseOne = retainSharedRealtimeSubscription(
      "profile:user-1",
      listenerOne,
      startMock,
    );
    const releaseTwo = retainSharedRealtimeSubscription(
      "profile:user-1",
      listenerTwo,
      startMock,
    );

    expect(startMock).toHaveBeenCalledTimes(1);

    expect(state.notify).not.toBeNull();
    if (state.notify) {
      state.notify();
    }

    expect(listenerOne).toHaveBeenCalledTimes(1);
    expect(listenerTwo).toHaveBeenCalledTimes(1);

    releaseOne();
    expect(cleanupMock).not.toHaveBeenCalled();

    releaseTwo();
    expect(cleanupMock).toHaveBeenCalledTimes(1);
  });

  it("defers subscription startup and cancels before it begins", () => {
    const startMock = vi.fn();

    const cancel = deferRealtimeSubscriptionStart(startMock, 300);
    vi.advanceTimersByTime(200);

    expect(startMock).not.toHaveBeenCalled();

    cancel();
    vi.advanceTimersByTime(200);

    expect(startMock).not.toHaveBeenCalled();
  });
});
