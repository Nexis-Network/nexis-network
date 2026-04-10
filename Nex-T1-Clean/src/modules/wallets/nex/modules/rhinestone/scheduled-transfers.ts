
import { encodeFunctionData, type Address, type Hex } from "viem";

export const SCHEDULED_TRANSFERS_ABI = [
  {
    type: "function",
    name: "addTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interval", type: "uint256" },
      { name: "start", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }], // transferId
  },
] as const;

export type ScheduledTransferConfig = {
  token: Address;
  to: Address;
  amount: bigint;
  interval: number;
  start: number;
};

export function encodeAddTransfer(config: ScheduledTransferConfig): Hex {
  return encodeFunctionData({
    abi: SCHEDULED_TRANSFERS_ABI,
    functionName: "addTransfer",
    args: [
      config.token,
      config.to,
      config.amount,
      BigInt(config.interval),
      BigInt(config.start),
    ],
  });
}
