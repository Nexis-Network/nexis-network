
import { encodeFunctionData, type Address, type Hex } from "viem";

export const SOCIAL_RECOVERY_ABI = [
  {
    type: "function",
    name: "addGuardianWithThreshold",
    stateMutability: "nonpayable",
    inputs: [
      { name: "guardian", type: "address" },
      { name: "threshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeGuardianWithThreshold",
    stateMutability: "nonpayable",
    inputs: [
      { name: "prevGuardian", type: "address" },
      { name: "guardian", type: "address" },
      { name: "threshold", type: "uint256" },
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
      { name: "newOwner", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getGuardians",
    stateMutability: "view",
    inputs: [{ name: "_wallet", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getRecoveryRequest",
    stateMutability: "view",
    inputs: [{ name: "_wallet", type: "address" }],
    outputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "guardiansApprovalCount", type: "uint256" },
          { name: "newThreshold", type: "uint256" },
          { name: "executeAfter", type: "uint64" },
          { name: "newOwners", type: "address[]" },
        ],
      },
    ],
  },
] as const;

export function encodeAddGuardian(guardian: Address, threshold: bigint): Hex {
  return encodeFunctionData({
    abi: SOCIAL_RECOVERY_ABI,
    functionName: "addGuardianWithThreshold",
    args: [guardian, threshold],
  });
}
