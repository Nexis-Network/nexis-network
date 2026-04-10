
import { encodeFunctionData, type Address, type Hex } from "viem";

export const SCHEDULED_ORDERS_ABI = [
  {
    type: "function",
    name: "addOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "interval", type: "uint256" },
      { name: "start", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }], // orderId
  },
  {
    type: "function",
    name: "cancelOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "bytes32" }],
    outputs: [],
  },
] as const;

export type ScheduledOrderConfig = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
  recipient: Address;
  interval: number;
  start: number;
};

export function encodeAddOrder(config: ScheduledOrderConfig): Hex {
  return encodeFunctionData({
    abi: SCHEDULED_ORDERS_ABI,
    functionName: "addOrder",
    args: [
      config.tokenIn,
      config.tokenOut,
      config.amountIn,
      config.minAmountOut,
      config.recipient,
      BigInt(config.interval),
      BigInt(config.start),
    ],
  });
}
