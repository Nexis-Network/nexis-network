
import { encodeFunctionData, type Address, type Hex } from "viem";

// Safe Core methods for Guard management
export const SAFE_GUARD_ABI = [
  {
    type: "function",
    name: "setGuard",
    stateMutability: "nonpayable",
    inputs: [{ name: "guard", type: "address" }],
    outputs: [],
  },
] as const;

export function encodeSetGuard(guard: Address): Hex {
  return encodeFunctionData({
    abi: SAFE_GUARD_ABI,
    functionName: "setGuard",
    args: [guard],
  });
}

// Example Generic Guard Interface (for reference)
export const GENERIC_GUARD_ABI = [
  {
    type: "function",
    name: "checkTransaction",
    stateMutability: "view",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
      { name: "msgSender", type: "address" },
    ],
    outputs: [],
  },
] as const;
