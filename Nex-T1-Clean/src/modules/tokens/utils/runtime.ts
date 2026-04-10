import { getChainInfo } from "@/modules/tokens/chains";
import type { ChainGasConfig, GasWarningThresholds } from "@/modules/tokens/types";

const DEFAULT_BLOCK_TIME_MS = 12_000;
const DEFAULT_GAS_CONFIG: ChainGasConfig = {
  marginBps: 2000,
  supportsEip1559: true,
  maxPriorityFeeGwei: 2,
  maxFeeGwei: 40,
};
const DEFAULT_GAS_THRESHOLDS: GasWarningThresholds = {
  mediumUsd: 8,
  highUsd: 25,
};

export function getAverageBlockTimeMs(chainId: number): number {
  return getChainInfo(chainId)?.averageBlockTimeMs ?? DEFAULT_BLOCK_TIME_MS;
}

export function estimateFutureBlockTimestamp(input: {
  chainId: number;
  currentBlockNumber: number;
  targetBlockNumber: number;
  currentBlockTimestamp: number;
}): number {
  const deltaBlocks = Math.max(input.targetBlockNumber - input.currentBlockNumber, 0);
  const deltaSeconds = Math.round((getAverageBlockTimeMs(input.chainId) * deltaBlocks) / 1000);
  return input.currentBlockTimestamp + deltaSeconds;
}

export function getPollingIntervalMs(chainId: number): number {
  return getChainInfo(chainId)?.pollingIntervalMs ?? getAverageBlockTimeMs(chainId);
}

export function calculateGasMargin(value: bigint, marginBps = 2000): bigint {
  return (value * BigInt(10_000 + marginBps)) / 10_000n;
}

export function getDefaultGasConfig(chainId: number): ChainGasConfig {
  return getChainInfo(chainId)?.gasConfig ?? DEFAULT_GAS_CONFIG;
}

export function getGasWarningThresholds(chainId: number): GasWarningThresholds {
  return getChainInfo(chainId)?.gasWarningThresholds ?? DEFAULT_GAS_THRESHOLDS;
}
