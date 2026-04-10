
import { encodeFunctionData, type Address, type Hex } from "viem";

// ERC-7579 Module Types
export const MODULE_TYPE_VALIDATOR = 1;
export const MODULE_TYPE_EXECUTOR = 2;
export const MODULE_TYPE_FALLBACK = 3;
export const MODULE_TYPE_HOOK = 4;

export type ModuleType = 
  | typeof MODULE_TYPE_VALIDATOR
  | typeof MODULE_TYPE_EXECUTOR
  | typeof MODULE_TYPE_FALLBACK
  | typeof MODULE_TYPE_HOOK;

export const ERC7579_ABI = [
  {
    type: "function",
    name: "installModule",
    stateMutability: "nonpayable",
    inputs: [
      { name: "moduleType", type: "uint256" },
      { name: "module", type: "address" },
      { name: "initData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "uninstallModule",
    stateMutability: "nonpayable",
    inputs: [
      { name: "moduleType", type: "uint256" },
      { name: "module", type: "address" },
      { name: "deInitData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isModuleInstalled",
    stateMutability: "view",
    inputs: [
      { name: "moduleType", type: "uint256" },
      { name: "module", type: "address" },
      { name: "additionalContext", type: "bytes" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export function encodeInstallModule(
  type: ModuleType,
  moduleAddress: Address,
  initData: Hex
): Hex {
  return encodeFunctionData({
    abi: ERC7579_ABI,
    functionName: "installModule",
    args: [BigInt(type), moduleAddress, initData],
  });
}

export function encodeUninstallModule(
  type: ModuleType,
  moduleAddress: Address,
  deInitData: Hex
): Hex {
  return encodeFunctionData({
    abi: ERC7579_ABI,
    functionName: "uninstallModule",
    args: [BigInt(type), moduleAddress, deInitData],
  });
}
