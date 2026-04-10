"use client";

const REWARD_DEVICE_STORAGE_KEY = "nex_reward_device_id";

function generateRewardDeviceId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) {
    return random;
  }

  return `reward-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRewardDeviceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existing = window.localStorage.getItem(REWARD_DEVICE_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const nextValue = generateRewardDeviceId();
    window.localStorage.setItem(REWARD_DEVICE_STORAGE_KEY, nextValue);
    return nextValue;
  } catch {
    return null;
  }
}
