import { describe, expect, it } from "vitest";

import {
  calculateGasMargin,
  estimateFutureBlockTimestamp,
  getAverageBlockTimeMs,
  getDefaultGasConfig,
  getGasWarningThresholds,
  getPollingIntervalMs,
} from "@/modules/tokens/utils/runtime";

describe("token runtime utilities", () => {
  it("returns chain block-time metadata", () => {
    expect(getAverageBlockTimeMs(1)).toBeGreaterThan(0);
    expect(getAverageBlockTimeMs(999999)).toBeGreaterThan(0);
    expect(getPollingIntervalMs(1)).toBeGreaterThanOrEqual(getAverageBlockTimeMs(1));
  });

  it("estimates future block timestamps from chain block times", () => {
    expect(
      estimateFutureBlockTimestamp({
        chainId: 1,
        currentBlockNumber: 100,
        targetBlockNumber: 110,
        currentBlockTimestamp: 1_700_000_000,
      }),
    ).toBe(1_700_000_120);
  });

  it("calculates gas margin in basis points using bigint", () => {
    expect(calculateGasMargin(1000n)).toBe(1200n);
    expect(calculateGasMargin(1000n, 500)).toBe(1050n);
  });

  it("exposes chain gas defaults and warning thresholds", () => {
    expect(getDefaultGasConfig(1).marginBps).toBe(2000);
    expect(getGasWarningThresholds(1).highUsd).toBeGreaterThan(
      getGasWarningThresholds(1).mediumUsd,
    );
  });
});
