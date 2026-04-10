
import { encodeFunctionData, type Address, type Hex } from "viem";

export const ALLOWANCE_MODULE_ADDRESS = "0x388B04aa469D68a1B76074127D95F7732cf3980C"; // Canonical v0.1.0

export const ALLOWANCE_MODULE_ABI = [
  {
    type: "function",
    name: "addDelegate",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setAllowance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegate", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "resetTimeMin", type: "uint48" },
      { name: "resetBaseMin", type: "uint48" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "executeAllowanceTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "safe", type: "address" },
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "delegate", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getTokenAllowance",
    stateMutability: "view",
    inputs: [
      { name: "safe", type: "address" },
      { name: "delegate", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ type: "uint256[5]" }], // amount, spent, resetTimeMin, lastResetMin, nonce
  },
] as const;

export type AllowanceConfig = {
  delegate: Address;
  token: Address;
  amount: bigint;
  resetTimeMin: number;
  resetBaseMin?: number;
};

export function encodeSetAllowance(config: AllowanceConfig): Hex {
  return encodeFunctionData({
    abi: ALLOWANCE_MODULE_ABI,
    functionName: "setAllowance",
    args: [
      config.delegate,
      config.token,
      config.amount,
      config.resetTimeMin,
      config.resetBaseMin ?? 0,
    ],
  });
}

export function encodeAddDelegate(delegate: Address): Hex {
  return encodeFunctionData({
    abi: ALLOWANCE_MODULE_ABI,
    functionName: "addDelegate",
    args: [delegate],
  });
}
