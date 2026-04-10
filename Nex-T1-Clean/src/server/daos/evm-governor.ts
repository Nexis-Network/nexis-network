import "server-only";

import { encodeFunctionData, keccak256, stringToHex, type Address } from "viem";

type JsonRecord = Record<string, UntypedJson>;

type GovernorActionInput = {
  targetAddress?: string | null;
  valueBaseUnits?: string | number | null;
  payload?: UntypedJson;
};

type NormalizedGovernorAction = {
  target: Address;
  value: bigint;
  calldata: `0x${string}`;
};

export const GOVERNOR_ABI = [
  {
    type: "function",
    name: "propose",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "castVote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "castVoteWithReason",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "queue",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function asJsonRecord(value: UntypedJson | null | undefined): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as JsonRecord;
}

function firstString(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function parseValueBaseUnits(value: string | number | null | undefined): bigint {
  if (typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/u.test(value)) {
    return BigInt(value);
  }
  return 0n;
}

function normalizeGovernorAction(action: GovernorActionInput): NormalizedGovernorAction {
  const payload = asJsonRecord(action.payload);
  const target = (
    action.targetAddress?.trim() ??
    firstString(payload, ["targetAddress", "target", "to", "recipient"])
  ) as Address | undefined;

  if (!target || !/^0x[a-fA-F0-9]{40}$/u.test(target)) {
    throw new Error("Governor action is missing a valid target address.");
  }

  const calldata = (
    firstString(payload, ["data", "calldata", "callData"]) ?? "0x"
  ) as `0x${string}`;

  if (!/^0x([a-fA-F0-9]{2})*$/u.test(calldata)) {
    throw new Error("Governor action calldata must be hex.");
  }

  return {
    target,
    value: parseValueBaseUnits(
      action.valueBaseUnits ??
        firstString(payload, ["valueBaseUnits", "valueWei", "value"]),
    ),
    calldata,
  };
}

function normalizeGovernorActions(actions: GovernorActionInput[]): {
  targets: Address[];
  values: bigint[];
  calldatas: `0x${string}`[];
} {
  const normalized = actions.map(normalizeGovernorAction);
  return {
    targets: normalized.map((action) => action.target),
    values: normalized.map((action) => action.value),
    calldatas: normalized.map((action) => action.calldata),
  };
}

function parseProposalId(proposalId: string | number | bigint): bigint {
  if (typeof proposalId === "bigint") return proposalId;
  if (typeof proposalId === "number") return BigInt(proposalId);
  if (typeof proposalId === "string" && /^\d+$/u.test(proposalId.trim())) {
    return BigInt(proposalId.trim());
  }
  throw new Error("Governor proposal IDs must be unsigned integer values.");
}

function mapVoteChoiceToSupport(choice: "for" | "against" | "abstain" | "veto"): 0 | 1 | 2 {
  switch (choice) {
    case "against":
      return 0;
    case "for":
      return 1;
    case "abstain":
      return 2;
    case "veto":
      throw new Error("OpenZeppelin Governor does not support veto votes.");
  }
}

export function encodeGovernorProposeTransaction(options: {
  governorAddress: string;
  description: string;
  actions: GovernorActionInput[];
}): { to: string; data: `0x${string}`; valueWei: "0" } {
  const args = normalizeGovernorActions(options.actions);
  return {
    to: options.governorAddress,
    valueWei: "0",
    data: encodeFunctionData({
      abi: GOVERNOR_ABI,
      functionName: "propose",
      args: [args.targets, args.values, args.calldatas, options.description],
    }),
  };
}

export function encodeGovernorVoteTransaction(options: {
  governorAddress: string;
  proposalId: string | number | bigint;
  choice: "for" | "against" | "abstain" | "veto";
  reason?: string | null;
}): { to: string; data: `0x${string}`; valueWei: "0" } {
  const support = mapVoteChoiceToSupport(options.choice);
  const proposalId = parseProposalId(options.proposalId);
  const reason = options.reason?.trim() ?? "";

  return {
    to: options.governorAddress,
    valueWei: "0",
    data: reason.length > 0
      ? encodeFunctionData({
          abi: GOVERNOR_ABI,
          functionName: "castVoteWithReason",
          args: [proposalId, support, reason],
        })
      : encodeFunctionData({
          abi: GOVERNOR_ABI,
          functionName: "castVote",
          args: [proposalId, support],
        }),
  };
}

export function encodeGovernorQueueTransaction(options: {
  governorAddress: string;
  description: string;
  actions: GovernorActionInput[];
}): { to: string; data: `0x${string}`; valueWei: "0" } {
  const args = normalizeGovernorActions(options.actions);
  const descriptionHash = keccak256(stringToHex(options.description));

  return {
    to: options.governorAddress,
    valueWei: "0",
    data: encodeFunctionData({
      abi: GOVERNOR_ABI,
      functionName: "queue",
      args: [args.targets, args.values, args.calldatas, descriptionHash],
    }),
  };
}

export function encodeGovernorExecuteTransaction(options: {
  governorAddress: string;
  description: string;
  actions: GovernorActionInput[];
}): { to: string; data: `0x${string}`; valueWei: "0" } {
  const args = normalizeGovernorActions(options.actions);
  const descriptionHash = keccak256(stringToHex(options.description));

  return {
    to: options.governorAddress,
    valueWei: "0",
    data: encodeFunctionData({
      abi: GOVERNOR_ABI,
      functionName: "execute",
      args: [args.targets, args.values, args.calldatas, descriptionHash],
    }),
  };
}

export function mapGovernorStateToDaoProposalStatus(
  state:
    | number
    | bigint,
): "draft" | "active" | "cancelled" | "defeated" | "succeeded" | "queued" | "expired" | "executed" {
  switch (Number(state)) {
    case 0:
      return "draft";
    case 1:
      return "active";
    case 2:
      return "cancelled";
    case 3:
      return "defeated";
    case 4:
      return "succeeded";
    case 5:
      return "queued";
    case 6:
      return "expired";
    case 7:
      return "executed";
    default:
      return "draft";
  }
}
