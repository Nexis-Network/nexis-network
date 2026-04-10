import "server-only";

import solc from "solc";
import {
  createPublicClient,
  encodeDeployData,
  encodeFunctionData,
  http,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";

import { normalizeDaoSlug } from "@/modules/daos/contracts";
export {
  encodeGovernorExecuteTransaction,
  encodeGovernorProposeTransaction,
  encodeGovernorQueueTransaction,
  encodeGovernorVoteTransaction,
  GOVERNOR_ABI,
  mapGovernorStateToDaoProposalStatus,
} from "@/server/daos/evm-governor";
import {
  encodeGovernorExecuteTransaction,
  encodeGovernorProposeTransaction,
  encodeGovernorQueueTransaction,
  encodeGovernorVoteTransaction,
  GOVERNOR_ABI,
  mapGovernorStateToDaoProposalStatus,
} from "@/server/daos/evm-governor";
import { loadDaoSolidityImport } from "@/server/daos/solidity-imports";
import { sendEvmTransactionViaCdp } from "@/server/services/cdp/evm-transactions";
import { getSafeTargetChains } from "@/server/services/safe/chains";

type CompiledContractArtifact = {
  abi: readonly unknown[];
  bytecode: Hex;
};

type CompiledEvmDaoArtifacts = {
  token: CompiledContractArtifact;
  timelock: CompiledContractArtifact;
  governor: CompiledContractArtifact;
};

type GovernorActionInput = {
  targetAddress?: string | null;
  valueBaseUnits?: string | number | null;
  payload?: UntypedJson;
};

type TallyProposalMetadata = {
  title?: string | null;
  description?: string | null;
  eta?: string | null;
  txHash?: string | null;
};

const DAO_GOVERNOR_SOURCE_FILE = "NexDaoGovernor.sol";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEFAULT_INITIAL_SUPPLY = "1000000000000000000000000";
const DEFAULT_TIMELOCK_DELAY_SECONDS = 24n * 60n * 60n;
const DEFAULT_VOTING_DELAY_BLOCKS = 1n;
const DEFAULT_VOTING_PERIOD_BLOCKS = 50_400n;
const DEFAULT_QUORUM_PERCENT = 4n;
const DEFAULT_PROPOSAL_THRESHOLD = 0n;
const PROPOSAL_CREATED_EVENT = {
  type: "event",
  name: "ProposalCreated",
  anonymous: false,
  inputs: [
    { indexed: false, name: "proposalId", type: "uint256" },
    { indexed: false, name: "proposer", type: "address" },
    { indexed: false, name: "targets", type: "address[]" },
    { indexed: false, name: "values", type: "uint256[]" },
    { indexed: false, name: "signatures", type: "string[]" },
    { indexed: false, name: "calldatas", type: "bytes[]" },
    { indexed: false, name: "voteStart", type: "uint256" },
    { indexed: false, name: "voteEnd", type: "uint256" },
    { indexed: false, name: "description", type: "string" },
  ],
} as const;

const TOKEN_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "delegate",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getVotes",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const SAFE_OWNER_ABI = [
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

const TIMelOCK_ABI = [
  {
    type: "function",
    name: "grantRole",
    stateMutability: "nonpayable",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeRole",
    stateMutability: "nonpayable",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getMinDelay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const GOVERNOR_READ_ABI = [
  ...GOVERNOR_ABI,
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "token",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "timelock",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "proposalVotes",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "proposalSnapshot",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "proposalDeadline",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "quorum",
    stateMutability: "view",
    inputs: [{ name: "timepoint", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

let COMPILED_CACHE: CompiledEvmDaoArtifacts | null = null;

function parseEvmChainId(chainRef: string): number {
  const match = /^eip155:(\d+)$/u.exec(chainRef.trim());
  if (!match) {
    throw new Error("EVM DAO operations require chainRef in CAIP-2 format: eip155:<chainId>.");
  }

  return Number.parseInt(match[1] ?? "", 10);
}

function resolveRpcUrl(chainRef: string): string {
  const chainId = parseEvmChainId(chainRef);
  const chain = getSafeTargetChains().find((candidate) => candidate.chainId === chainId);
  if (!chain) {
    throw new Error(`Unsupported EVM chain for DAO governance: ${chainId}`);
  }

  return chain.rpcUrl;
}

function createEvmPublicClient(chainRef: string) {
  return createPublicClient({
    transport: http(resolveRpcUrl(chainRef)),
  });
}

function normalizeEvmAddress(address: string): Address {
  const value = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/u.test(value)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  return value as Address;
}

function normalizeSymbol(name: string): string {
  const lettersOnly = name.toUpperCase().replace(/[^A-Z0-9]/gu, "");
  const trimmed = lettersOnly.slice(0, 8);
  return trimmed.length >= 3 ? trimmed : `DAO${trimmed}`.slice(0, 8);
}

function extractFatalSolcErrors(output: Record<string, unknown>): string[] {
  const errors = Array.isArray(output.errors) ? output.errors : [];
  return errors
    .filter((entry) => entry && typeof entry === "object" && (entry as { severity?: string }).severity === "error")
    .map((entry) => String((entry as { formattedMessage?: string }).formattedMessage ?? "Unknown Solidity compile error"));
}

function findImports(importPath: string): { contents?: string; error?: string } {
  return loadDaoSolidityImport(importPath);
}

function buildGovernorSource(): string {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract NexDaoGovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    constructor(
        string memory name_,
        string memory symbol_,
        address initialHolder,
        uint256 initialSupply
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        _mint(initialHolder, initialSupply);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}

contract NexDaoTimelockProxy is TimelockController {
    constructor(uint256 minDelay, address[] memory proposers, address[] memory executors, address admin)
        TimelockController(minDelay, proposers, executors, admin)
    {}
}

contract NexDaoGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(
        string memory name_,
        IVotes tokenAddress,
        TimelockController timelockAddress,
        uint48 votingDelayBlocks,
        uint32 votingPeriodBlocks,
        uint256 proposalThresholdTokens,
        uint256 quorumPercent
    )
        Governor(name_)
        GovernorSettings(votingDelayBlocks, votingPeriodBlocks, proposalThresholdTokens)
        GovernorVotes(tokenAddress)
        GovernorVotesQuorumFraction(quorumPercent)
        GovernorTimelockControl(timelockAddress)
    {}

    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 timepoint)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(timepoint);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint48)
    {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}`;
}

function getCompiledArtifacts(): CompiledEvmDaoArtifacts {
  if (COMPILED_CACHE) {
    return COMPILED_CACHE;
  }

  const input = {
    language: "Solidity",
    sources: {
      [DAO_GOVERNOR_SOURCE_FILE]: {
        content: buildGovernorSource(),
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const compiled = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: findImports,
    }),
  ) as Record<string, unknown>;

  const fatalErrors = extractFatalSolcErrors(compiled);
  if (fatalErrors.length > 0) {
    throw new Error(`DAO Governor compilation failed:\n${fatalErrors.join("\n")}`);
  }

  const contracts = (compiled.contracts as Record<string, Record<string, { abi: readonly unknown[]; evm?: { bytecode?: { object?: string } } }>>) ?? {};
  const sourceContracts = contracts[DAO_GOVERNOR_SOURCE_FILE] ?? {};
  const token = sourceContracts.NexDaoGovernanceToken;
  const timelock = sourceContracts.NexDaoTimelockProxy;
  const governor = sourceContracts.NexDaoGovernor;

  if (!token?.abi || !token.evm?.bytecode?.object) {
    throw new Error("Compiled DAO token artifact is missing.");
  }
  if (!timelock?.abi || !timelock.evm?.bytecode?.object) {
    throw new Error("Compiled DAO timelock artifact is missing.");
  }
  if (!governor?.abi || !governor.evm?.bytecode?.object) {
    throw new Error("Compiled DAO governor artifact is missing.");
  }

  COMPILED_CACHE = {
    token: {
      abi: token.abi,
      bytecode: `0x${token.evm.bytecode.object}` as Hex,
    },
    timelock: {
      abi: timelock.abi,
      bytecode: `0x${timelock.evm.bytecode.object}` as Hex,
    },
    governor: {
      abi: governor.abi,
      bytecode: `0x${governor.evm.bytecode.object}` as Hex,
    },
  };

  return COMPILED_CACHE;
}

function asNumericString(value: bigint | number | null | undefined): string | null {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value).toString() : null;
  return null;
}

function asJsonRecord(value: UntypedJson | null | undefined): Record<string, UntypedJson> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, UntypedJson>;
}

function extractActionPayload(action: GovernorActionInput): {
  targetAddress: Address;
  valueBaseUnits: string;
  data: `0x${string}`;
} {
  const payload = asJsonRecord(action.payload);
  const targetAddress = normalizeEvmAddress(
    String(
      action.targetAddress ??
        payload.targetAddress ??
        payload.target ??
        payload.to ??
        payload.recipient,
    ),
  );
  const data = String(payload.data ?? payload.calldata ?? payload.callData ?? "0x") as `0x${string}`;
  const valueBaseUnits = String(
    action.valueBaseUnits ??
      payload.valueBaseUnits ??
      payload.valueWei ??
      payload.value ??
      "0",
  );

  return {
    targetAddress,
    valueBaseUnits,
    data,
  };
}

function extractProposalTitle(description: string, fallbackId?: string): string {
  const firstMeaningfulLine = description
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (firstMeaningfulLine) {
    return firstMeaningfulLine.replace(/^#+\s*/u, "").trim();
  }

  return fallbackId ? `Proposal ${fallbackId}` : "Untitled proposal";
}

function buildProposalDescription(title: string, description?: string | null): string {
  const trimmedDescription = description?.trim();
  return trimmedDescription
    ? `# ${title.trim()}\n${trimmedDescription}`
    : `# ${title.trim()}`;
}

function buildTallyGovernorId(chainRef: string, governorAddress: string): string {
  return `${chainRef}:${governorAddress.trim().toLowerCase()}`;
}

async function fetchTallyProposalMetadata(options: {
  chainRef: string;
  governorAddress: string;
  proposalId: string;
}): Promise<TallyProposalMetadata | null> {
  const apiKey = process.env.TALLY_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const governorId = buildTallyGovernorId(options.chainRef, options.governorAddress);
  const response = await fetch("https://api.tally.xyz/query", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify({
      query: `
        query Proposal($input: ProposalInput!) {
          proposal(input: $input) {
            metadata {
              title
              description
              eta
              txHash
            }
          }
        }
      `,
      variables: {
        input: {
          governorId,
          onchainId: options.proposalId,
        },
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as {
    data?: {
      proposal?: {
        metadata?: TallyProposalMetadata | null;
      } | null;
    } | null;
  } | null;

  return payload?.data?.proposal?.metadata ?? null;
}

export async function deployEvmDaoContracts(options: {
  userId: string;
  fromAddress: string;
  chainRef: string;
  daoName: string;
  daoSymbol?: string | null;
  description?: string | null;
  ownershipMode: "user" | "agent" | "hybrid";
  agentId?: string | null;
  initialSupplyBaseUnits?: string;
  timelockDelaySeconds?: bigint;
  votingDelayBlocks?: bigint;
  votingPeriodBlocks?: bigint;
  quorumPercent?: bigint;
  proposalThreshold?: bigint;
}): Promise<{
  tokenAddress: Address;
  timelockAddress: Address;
  governorAddress: Address;
  deploymentTxHashes: {
    token: string;
    delegateVotes: string;
    timelock: string;
    governor: string;
    grantProposerRole: string;
    revokeAdminRole: string;
  };
}> {
  const chainId = parseEvmChainId(options.chainRef);
  const fromAddress = normalizeEvmAddress(options.fromAddress);
  const artifacts = getCompiledArtifacts();
  const publicClient = createEvmPublicClient(options.chainRef);
  const daoSymbol = options.daoSymbol?.trim() || normalizeSymbol(options.daoName);
  const initialSupply = BigInt(options.initialSupplyBaseUnits ?? DEFAULT_INITIAL_SUPPLY);
  const timelockDelaySeconds = options.timelockDelaySeconds ?? DEFAULT_TIMELOCK_DELAY_SECONDS;
  const votingDelayBlocks = options.votingDelayBlocks ?? DEFAULT_VOTING_DELAY_BLOCKS;
  const votingPeriodBlocks = options.votingPeriodBlocks ?? DEFAULT_VOTING_PERIOD_BLOCKS;
  const quorumPercent = options.quorumPercent ?? DEFAULT_QUORUM_PERCENT;
  const proposalThreshold = options.proposalThreshold ?? DEFAULT_PROPOSAL_THRESHOLD;

  const tokenDeployData = encodeDeployData({
    abi: artifacts.token.abi,
    bytecode: artifacts.token.bytecode,
    args: [options.daoName, daoSymbol, fromAddress, initialSupply],
  } as never);

  const tokenDeployment = await sendEvmTransactionViaCdp(
    {
      fromAddress,
      chainId,
      data: tokenDeployData,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );

  const tokenReceipt = await publicClient.waitForTransactionReceipt({
    hash: tokenDeployment.txHash as Hex,
  });
  if (!tokenReceipt.contractAddress) {
    throw new Error("Governance token deployment did not return a contract address.");
  }
  const tokenAddress = tokenReceipt.contractAddress;

  const delegateCallData = encodeFunctionData({
    abi: TOKEN_ABI,
    functionName: "delegate",
    args: [fromAddress],
  });
  const delegateVotes = await sendEvmTransactionViaCdp(
    {
      fromAddress,
      chainId,
      to: tokenAddress,
      data: delegateCallData,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );
  await publicClient.waitForTransactionReceipt({
    hash: delegateVotes.txHash as Hex,
  });

  const timelockDeployData = encodeDeployData({
    abi: artifacts.timelock.abi,
    bytecode: artifacts.timelock.bytecode,
    args: [timelockDelaySeconds, [], [ZERO_ADDRESS], fromAddress],
  } as never);
  const timelockDeployment = await sendEvmTransactionViaCdp(
    {
      fromAddress,
      chainId,
      data: timelockDeployData,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );
  const timelockReceipt = await publicClient.waitForTransactionReceipt({
    hash: timelockDeployment.txHash as Hex,
  });
  if (!timelockReceipt.contractAddress) {
    throw new Error("Timelock deployment did not return a contract address.");
  }
  const timelockAddress = timelockReceipt.contractAddress;

  const governorDeployData = encodeDeployData({
    abi: artifacts.governor.abi,
    bytecode: artifacts.governor.bytecode,
    args: [
      options.daoName,
      tokenAddress,
      timelockAddress,
      votingDelayBlocks,
      votingPeriodBlocks,
      proposalThreshold,
      quorumPercent,
    ],
  } as never);
  const governorDeployment = await sendEvmTransactionViaCdp(
    {
      fromAddress,
      chainId,
      data: governorDeployData,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );
  const governorReceipt = await publicClient.waitForTransactionReceipt({
    hash: governorDeployment.txHash as Hex,
  });
  if (!governorReceipt.contractAddress) {
    throw new Error("Governor deployment did not return a contract address.");
  }
  const governorAddress = governorReceipt.contractAddress;

  const proposerRole = keccak256(stringToHex("PROPOSER_ROLE"));
  const grantProposerCall = encodeFunctionData({
    abi: TIMelOCK_ABI,
    functionName: "grantRole",
    args: [proposerRole, governorAddress],
  });
  const grantProposerRole = await sendEvmTransactionViaCdp(
    {
      fromAddress,
      chainId,
      to: timelockAddress,
      data: grantProposerCall,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );
  await publicClient.waitForTransactionReceipt({
    hash: grantProposerRole.txHash as Hex,
  });

  const defaultAdminRole = `0x${"0".repeat(64)}` as Hex;
  const revokeAdminCall = encodeFunctionData({
    abi: TIMelOCK_ABI,
    functionName: "revokeRole",
    args: [defaultAdminRole, fromAddress],
  });
  const revokeAdminRole = await sendEvmTransactionViaCdp(
    {
      fromAddress,
      chainId,
      to: timelockAddress,
      data: revokeAdminCall,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );
  await publicClient.waitForTransactionReceipt({
    hash: revokeAdminRole.txHash as Hex,
  });

  return {
    tokenAddress,
    timelockAddress,
    governorAddress,
    deploymentTxHashes: {
      token: tokenDeployment.txHash,
      delegateVotes: delegateVotes.txHash,
      timelock: timelockDeployment.txHash,
      governor: governorDeployment.txHash,
      grantProposerRole: grantProposerRole.txHash,
      revokeAdminRole: revokeAdminRole.txHash,
    },
  };
}

export async function inspectEvmGovernorDao(options: {
  chainRef: string;
  governanceAddress: string;
}): Promise<{
  name: string;
  governanceAddress: string;
  tokenAddress: string;
  timelockAddress: string;
  token: {
    name: string;
    symbol: string;
    totalSupply: string;
  };
  timelockDelaySeconds: string;
}> {
  const publicClient = createEvmPublicClient(options.chainRef);
  const governanceAddress = normalizeEvmAddress(options.governanceAddress);

  const [name, tokenAddress, timelockAddress] = await Promise.all([
    publicClient.readContract({
      address: governanceAddress,
      abi: GOVERNOR_READ_ABI,
      functionName: "name",
    }),
    publicClient.readContract({
      address: governanceAddress,
      abi: GOVERNOR_READ_ABI,
      functionName: "token",
    }),
    publicClient.readContract({
      address: governanceAddress,
      abi: GOVERNOR_READ_ABI,
      functionName: "timelock",
    }),
  ]);

  const normalizedTokenAddress = normalizeEvmAddress(String(tokenAddress));
  const normalizedTimelockAddress = normalizeEvmAddress(String(timelockAddress));

  const [tokenName, tokenSymbol, totalSupply, minDelay] = await Promise.all([
    publicClient.readContract({
      address: normalizedTokenAddress,
      abi: TOKEN_ABI,
      functionName: "name",
    }),
    publicClient.readContract({
      address: normalizedTokenAddress,
      abi: TOKEN_ABI,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: normalizedTokenAddress,
      abi: TOKEN_ABI,
      functionName: "totalSupply",
    }),
    publicClient.readContract({
      address: normalizedTimelockAddress,
      abi: TIMelOCK_ABI,
      functionName: "getMinDelay",
    }),
  ]);

  return {
    name: String(name),
    governanceAddress,
    tokenAddress: normalizedTokenAddress,
    timelockAddress: normalizedTimelockAddress,
    token: {
      name: String(tokenName),
      symbol: String(tokenSymbol),
      totalSupply: String(totalSupply),
    },
    timelockDelaySeconds: String(minDelay),
  };
}

export async function verifyEvmDaoImportAccess(options: {
  chainRef: string;
  governanceAddress?: string | null;
  safeAddress?: string | null;
  proofAddress: string;
}): Promise<{
  hasAccess: boolean;
  accessType: "safe-owner" | "token-voting-power" | null;
  tokenVotes: string | null;
}> {
  const publicClient = createEvmPublicClient(options.chainRef);
  const proofAddress = normalizeEvmAddress(options.proofAddress);

  if (options.safeAddress) {
    const owners = await publicClient.readContract({
      address: normalizeEvmAddress(options.safeAddress),
      abi: SAFE_OWNER_ABI,
      functionName: "getOwners",
    });

    const normalizedOwners = Array.isArray(owners)
      ? owners
          .filter((owner): owner is string => typeof owner === "string")
          .map((owner) => owner.toLowerCase())
      : [];

    if (normalizedOwners.includes(proofAddress.toLowerCase())) {
      return {
        hasAccess: true,
        accessType: "safe-owner",
        tokenVotes: null,
      };
    }
  }

  if (!options.governanceAddress) {
    return {
      hasAccess: false,
      accessType: null,
      tokenVotes: null,
    };
  }

  const inspectedDao = await inspectEvmGovernorDao({
    chainRef: options.chainRef,
    governanceAddress: options.governanceAddress,
  });

  const votes = await publicClient
    .readContract({
      address: normalizeEvmAddress(inspectedDao.tokenAddress),
      abi: TOKEN_ABI,
      functionName: "getVotes",
      args: [proofAddress],
    })
    .catch(async () => {
      return publicClient.readContract({
        address: normalizeEvmAddress(inspectedDao.tokenAddress),
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [proofAddress],
      });
    });

  const tokenVotes = String(votes);
  if (BigInt(tokenVotes) > 0n) {
    return {
      hasAccess: true,
      accessType: "token-voting-power",
      tokenVotes,
    };
  }

  return {
    hasAccess: false,
    accessType: null,
    tokenVotes,
  };
}

export async function submitEvmGovernorProposal(options: {
  userId: string;
  fromAddress: string;
  chainRef: string;
  governorAddress: string;
  title: string;
  description?: string | null;
  actions: GovernorActionInput[];
  agentId?: string | null;
}): Promise<{ txHash: string; description: string; proposalId: string }> {
  const chainId = parseEvmChainId(options.chainRef);
  const publicClient = createEvmPublicClient(options.chainRef);
  const description = buildProposalDescription(options.title, options.description);
  const normalizedGovernorAddress = normalizeEvmAddress(options.governorAddress);
  const tx = encodeGovernorProposeTransaction({
    governorAddress: normalizedGovernorAddress,
    description,
    actions: options.actions,
  });
  const normalizedActions = options.actions.map(extractActionPayload);
  const proposalId = await publicClient.readContract({
    address: normalizedGovernorAddress,
    abi: [
      ...GOVERNOR_READ_ABI,
      {
        type: "function",
        name: "hashProposal",
        stateMutability: "pure",
        inputs: [
          { name: "targets", type: "address[]" },
          { name: "values", type: "uint256[]" },
          { name: "calldatas", type: "bytes[]" },
          { name: "descriptionHash", type: "bytes32" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "hashProposal",
    args: [
      normalizedActions.map((action) => action.targetAddress),
      normalizedActions.map((action) => BigInt(action.valueBaseUnits)),
      normalizedActions.map((action) => action.data),
      keccak256(stringToHex(description)),
    ],
  });

  const result = await sendEvmTransactionViaCdp(
    {
      fromAddress: normalizeEvmAddress(options.fromAddress),
      chainId,
      to: tx.to,
      data: tx.data,
      valueWei: tx.valueWei,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );

  return {
    txHash: result.txHash,
    description,
    proposalId: String(proposalId),
  };
}

export async function castEvmGovernorVote(options: {
  userId: string;
  fromAddress: string;
  chainRef: string;
  governorAddress: string;
  proposalId: string;
  choice: "for" | "against" | "abstain" | "veto";
  reason?: string | null;
  agentId?: string | null;
}): Promise<{ txHash: string }> {
  const chainId = parseEvmChainId(options.chainRef);
  const tx = encodeGovernorVoteTransaction({
    governorAddress: normalizeEvmAddress(options.governorAddress),
    proposalId: options.proposalId,
    choice: options.choice,
    reason: options.reason,
  });

  const result = await sendEvmTransactionViaCdp(
    {
      fromAddress: normalizeEvmAddress(options.fromAddress),
      chainId,
      to: tx.to,
      data: tx.data,
      valueWei: tx.valueWei,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );

  return { txHash: result.txHash };
}

export async function queueEvmGovernorProposal(options: {
  userId: string;
  fromAddress: string;
  chainRef: string;
  governorAddress: string;
  proposal: {
    description: string;
    actions: GovernorActionInput[];
  };
  agentId?: string | null;
}): Promise<{ txHash: string }> {
  const chainId = parseEvmChainId(options.chainRef);
  const tx = encodeGovernorQueueTransaction({
    governorAddress: normalizeEvmAddress(options.governorAddress),
    description: options.proposal.description,
    actions: options.proposal.actions,
  });

  const result = await sendEvmTransactionViaCdp(
    {
      fromAddress: normalizeEvmAddress(options.fromAddress),
      chainId,
      to: tx.to,
      data: tx.data,
      valueWei: tx.valueWei,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );

  return { txHash: result.txHash };
}

export async function executeEvmGovernorProposal(options: {
  userId: string;
  fromAddress: string;
  chainRef: string;
  governorAddress: string;
  proposal: {
    description: string;
    actions: GovernorActionInput[];
  };
  agentId?: string | null;
}): Promise<{ txHash: string }> {
  const chainId = parseEvmChainId(options.chainRef);
  const tx = encodeGovernorExecuteTransaction({
    governorAddress: normalizeEvmAddress(options.governorAddress),
    description: options.proposal.description,
    actions: options.proposal.actions,
  });

  const result = await sendEvmTransactionViaCdp(
    {
      fromAddress: normalizeEvmAddress(options.fromAddress),
      chainId,
      to: tx.to,
      data: tx.data,
      valueWei: tx.valueWei,
    },
    options.userId,
    options.agentId ? { agentId: options.agentId } : undefined,
  );

  return { txHash: result.txHash };
}

export async function syncEvmGovernorProposals(options: {
  chainRef: string;
  governorAddress: string;
  fromBlock?: bigint;
}): Promise<Array<{
  externalProposalId: string;
  title: string;
  slug: string;
  description: string;
  status: ReturnType<typeof mapGovernorStateToDaoProposalStatus>;
  startAt: string | null;
  endAt: string | null;
  quorum: string | null;
  forVotes: string | null;
  againstVotes: string | null;
  abstainVotes: string | null;
  actions: UntypedJson[];
  metadata: Record<string, UntypedJson>;
}>> {
  const publicClient = createEvmPublicClient(options.chainRef);
  const governorAddress = normalizeEvmAddress(options.governorAddress);

  const logs = await publicClient.getLogs({
    address: governorAddress,
    event: PROPOSAL_CREATED_EVENT,
    ...(options.fromBlock !== undefined ? { fromBlock: options.fromBlock } : {}),
  });

  return Promise.all(
    logs.map(async (log) => {
      const args = (log.args ?? {}) as {
        proposalId?: bigint;
        proposer?: string;
        targets?: string[];
        values?: bigint[];
        calldatas?: string[];
        voteStart?: bigint;
        voteEnd?: bigint;
        description?: string;
      };

      const proposalId = String(args.proposalId ?? "0");
      const description = args.description ?? "";
      const titleFromDescription = extractProposalTitle(description, proposalId);
      const [state, proposalVotes, snapshot, deadline, block, tallyMetadata] = await Promise.all([
        publicClient.readContract({
          address: governorAddress,
          abi: GOVERNOR_READ_ABI,
          functionName: "state",
          args: [BigInt(proposalId)],
        }),
        publicClient.readContract({
          address: governorAddress,
          abi: GOVERNOR_READ_ABI,
          functionName: "proposalVotes",
          args: [BigInt(proposalId)],
        }) as Promise<readonly [bigint, bigint, bigint]>,
        publicClient.readContract({
          address: governorAddress,
          abi: GOVERNOR_READ_ABI,
          functionName: "proposalSnapshot",
          args: [BigInt(proposalId)],
        }).catch(() => args.voteStart ?? BigInt(log.blockNumber ?? 0n)),
        publicClient.readContract({
          address: governorAddress,
          abi: GOVERNOR_READ_ABI,
          functionName: "proposalDeadline",
          args: [BigInt(proposalId)],
        }).catch(() => args.voteEnd ?? null),
        publicClient.getBlock({
          blockNumber: BigInt(log.blockNumber ?? 0n),
        }).catch(() => null),
        fetchTallyProposalMetadata({
          chainRef: options.chainRef,
          governorAddress,
          proposalId,
        }),
      ]);

      const quorum = snapshot !== null
        ? await publicClient.readContract({
            address: governorAddress,
            abi: GOVERNOR_READ_ABI,
            functionName: "quorum",
            args: [snapshot as bigint],
          }).catch(() => null)
        : null;

      const [againstVotes, forVotes, abstainVotes] = Array.isArray(proposalVotes)
        ? proposalVotes
        : [0n, 0n, 0n];

      const actions = (args.targets ?? []).map((target, index) => ({
        targetAddress: target,
        valueBaseUnits: String(args.values?.[index] ?? 0n),
        payload: {
          data: args.calldatas?.[index] ?? "0x",
        },
      }));

      const title = tallyMetadata?.title?.trim() || titleFromDescription;
      const resolvedDescription = tallyMetadata?.description?.trim() || description;
      const blockTimestamp = block ? Number(block.timestamp) * 1000 : null;

      return {
        externalProposalId: proposalId,
        title,
        slug: normalizeDaoSlug(title),
        description: resolvedDescription,
        status: mapGovernorStateToDaoProposalStatus(state as bigint | number),
        startAt: blockTimestamp ? new Date(blockTimestamp).toISOString() : null,
        endAt: null,
        quorum: asNumericString(quorum as bigint | number | null),
        forVotes: asNumericString(forVotes),
        againstVotes: asNumericString(againstVotes),
        abstainVotes: asNumericString(abstainVotes),
        actions,
        metadata: {
          chainRef: options.chainRef,
          governanceAddress: governorAddress,
          proposerAddress: args.proposer?.toLowerCase() ?? null,
          voteStartBlock: asNumericString(args.voteStart),
          voteEndBlock: asNumericString(args.voteEnd),
          proposalSnapshot: asNumericString(snapshot as bigint | number | null),
          proposalDeadline: asNumericString(deadline as bigint | number | null),
          tally: tallyMetadata ?? null,
          txHash: "transactionHash" in log && typeof log.transactionHash === "string"
            ? log.transactionHash
            : tallyMetadata?.txHash ?? null,
        },
      };
    }),
  );
}
