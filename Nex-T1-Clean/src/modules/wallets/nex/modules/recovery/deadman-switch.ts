
import { encodeFunctionData, type Address, type Hex } from "viem";

export const DEADMAN_SWITCH_ABI = [
  {
    type: "function",
    name: "setNominee",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nominee", type: "address" },
      { name: "timeout", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export function encodeSetNominee(nominee: Address, timeout: bigint): Hex {
  return encodeFunctionData({
    abi: DEADMAN_SWITCH_ABI,
    functionName: "setNominee",
    args: [nominee, timeout],
  });
}
