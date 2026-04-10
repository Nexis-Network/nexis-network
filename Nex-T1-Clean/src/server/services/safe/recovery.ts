// Domain: wallets (Safe)
// Responsibility: Resolve Social Recovery module deployments + provide minimal on-chain helpers.
// Depends on: @safe-global/safe-modules-deployments, viem
// Notes:
// - The Social Recovery module is not deployed on every chain; callers must handle nulls.

import { getSocialRecoveryModuleDeployment } from "@safe-global/safe-modules-deployments";
import { encodeFunctionData, type Address, isAddress } from "viem";

function envOverride(chainId: number): Address | null {
  const key = `SAFE_SOCIAL_RECOVERY_MODULE_${chainId}`;
  const value = process.env[key]?.trim();
  if (value && isAddress(value)) return value as Address;
  return null;
}

export function resolveSocialRecoveryModuleAddress(chainId: number): Address | null {
  const override = envOverride(chainId);
  if (override) return override;

  const deployment = getSocialRecoveryModuleDeployment({ released: true, network: String(chainId) });
  const address = deployment?.networkAddresses?.[String(chainId)];
  return typeof address === "string" && isAddress(address) ? (address as Address) : null;
}

// ABI for a typical Gnosis Safe Delay/Social Recovery configuration
// Supports configurable guardians, thresholds, and recovery delays.
export const RECOVERY_MODULE_ABI = [
  {
    type: "function",
    name: "addGuardian",
    stateMutability: "nonpayable",
    inputs: [{ name: "guardian", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeGuardian",
    stateMutability: "nonpayable",
    inputs: [
      { name: "prevGuardian", type: "address" },
      { name: "guardian", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "changeThreshold",
    stateMutability: "nonpayable",
    inputs: [{ name: "threshold", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "executeRecovery",
    stateMutability: "nonpayable",
    inputs: [
      { name: "safe", type: "address" },
      { name: "newOwners", type: "address[]" },
      { name: "newThreshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "safe", type: "address" }],
    outputs: [],
  },
] as const;

export function encodeAddGuardianData(guardian: Address) {
  return encodeFunctionData({
    abi: RECOVERY_MODULE_ABI,
    functionName: "addGuardian",
    args: [guardian],
  });
}

export function encodeRemoveGuardianData(prevGuardian: Address, guardian: Address) {
  return encodeFunctionData({
    abi: RECOVERY_MODULE_ABI,
    functionName: "removeGuardian",
    args: [prevGuardian, guardian],
  });
}

export function encodeChangeThresholdData(threshold: bigint) {
  return encodeFunctionData({
    abi: RECOVERY_MODULE_ABI,
    functionName: "changeThreshold",
    args: [threshold],
  });
}

export function encodeExecuteRecoveryData(safe: Address, newOwners: Address[], newThreshold: bigint) {
  return encodeFunctionData({
    abi: RECOVERY_MODULE_ABI,
    functionName: "executeRecovery",
    args: [safe, newOwners, newThreshold],
  });
}

export function encodeCancelRecoveryData(safe: Address) {
  return encodeFunctionData({
    abi: RECOVERY_MODULE_ABI,
    functionName: "cancelRecovery",
    args: [safe],
  });
}
