import solc from "solc";
import { createPublicClient, createWalletClient, encodeDeployData, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getSafeTargetChains } from "@/server/services/safe/chains";

const SOURCE_FILE = "NexLaunchpad.sol";
const SHARE_CONTRACT_ERC20 = "NexAgentShareToken";
const SHARE_CONTRACT_ERC404 = "NexAgentERC404Share";
const ESCROW_CONTRACT = "NexCampaignEscrow";

type CompiledContract = {
  abi: UntypedJson;
  bytecode: Hex;
};

type CompiledArtifacts = {
  shareTokenErc20: CompiledContract;
  shareTokenErc404: CompiledContract;
  campaignEscrow: CompiledContract;
};

type DeployParams = {
  chainId: number;
  tokenName: string;
  tokenSymbol: string;
  tokenStandard?: "erc20" | "erc404";
  treasuryAddress: Address;
  targetBaseUnits: string;
  minContributionBaseUnits: string;
  maxContributionBaseUnits?: string | null;
};

type DeployResult = {
  shareTokenAddress: Address;
  campaignAddress: Address;
  shareTokenDeployTxHash: Hex;
  campaignDeployTxHash: Hex;
  deployerAddress: Address;
};

let COMPILED_CACHE: CompiledArtifacts | null = null;

function parseChainRefToEvmChainId(chainRef: string): number {
  const match = /^eip155:(\d+)$/.exec(chainRef.trim());
  if (!match) {
    throw new Error("Campaign chain_ref must be EVM CAIP-2 format (eip155:<chainId>).");
  }
  return Number(match[1]);
}

function resolveCampaignPrivateKey(): `0x${string}` {
  const raw = process.env.PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("Missing PRIVATE_KEY.");
  }
  const normalized = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error("Invalid deployer private key format.");
  }
  return normalized;
}

function resolveRpcUrl(chainId: number): string {
  const chain = getSafeTargetChains().find((candidate) => candidate.chainId === chainId);
  if (!chain) {
    throw new Error(`Unsupported EVM chain for deployment: ${chainId}`);
  }
  return chain.rpcUrl;
}

function parseBaseUnits(value: string, field: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${field}: expected base-unit integer string.`);
  }
  return BigInt(value);
}

function getCompiledArtifacts(): CompiledArtifacts {
  if (COMPILED_CACHE) return COMPILED_CACHE;

  const source = `
pragma solidity ^0.8.20;

contract NexAgentShareToken {
  string public name;
  string public symbol;
  uint8 public constant decimals = 18;
  uint256 public totalSupply;
  address public immutable owner;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  constructor(string memory _name, string memory _symbol, address _owner) {
    name = _name;
    symbol = _symbol;
    owner = _owner;
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    require(allowed >= amount, "allowance");
    allowance[from][msg.sender] = allowed - amount;
    _transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) external {
    require(msg.sender == owner, "only owner");
    totalSupply += amount;
    balanceOf[to] += amount;
    emit Transfer(address(0), to, amount);
  }

  function _transfer(address from, address to, uint256 amount) private {
    require(to != address(0), "zero address");
    uint256 bal = balanceOf[from];
    require(bal >= amount, "balance");
    balanceOf[from] = bal - amount;
    balanceOf[to] += amount;
    emit Transfer(from, to, amount);
  }
}

contract NexAgentERC404Share {
  string public name;
  string public symbol;
  uint8 public constant decimals = 18;
  uint256 public constant UNIT = 1e18;
  uint256 public totalSupply;
  uint256 public nextTokenId;
  address public immutable owner;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  mapping(uint256 => address) public ownerOf;
  mapping(address => uint256[]) private _ownedTokens;
  mapping(uint256 => uint256) private _ownedTokenIndex;
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event TransferNFT(address indexed from, address indexed to, uint256 indexed tokenId);

  constructor(string memory _name, string memory _symbol, address _owner) {
    name = _name;
    symbol = _symbol;
    owner = _owner;
    nextTokenId = 1;
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    uint256 allowed = allowance[from][msg.sender];
    require(allowed >= amount, "allowance");
    allowance[from][msg.sender] = allowed - amount;
    _transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) external {
    require(msg.sender == owner, "only owner");
    totalSupply += amount;
    balanceOf[to] += amount;
    emit Transfer(address(0), to, amount);
    _syncNfts(to);
  }

  function tokensOf(address account) external view returns (uint256[] memory) {
    return _ownedTokens[account];
  }

  function _transfer(address from, address to, uint256 amount) private {
    require(to != address(0), "zero address");
    uint256 bal = balanceOf[from];
    require(bal >= amount, "balance");
    balanceOf[from] = bal - amount;
    balanceOf[to] += amount;
    emit Transfer(from, to, amount);
    _syncNfts(from);
    _syncNfts(to);
  }

  function _syncNfts(address account) private {
    uint256 desired = balanceOf[account] / UNIT;
    uint256 current = _ownedTokens[account].length;
    while (current < desired) {
      uint256 tokenId = nextTokenId++;
      ownerOf[tokenId] = account;
      _ownedTokenIndex[tokenId] = _ownedTokens[account].length;
      _ownedTokens[account].push(tokenId);
      emit TransferNFT(address(0), account, tokenId);
      current += 1;
    }
    while (current > desired) {
      uint256 lastIndex = _ownedTokens[account].length - 1;
      uint256 tokenIdToBurn = _ownedTokens[account][lastIndex];
      _ownedTokens[account].pop();
      delete _ownedTokenIndex[tokenIdToBurn];
      delete ownerOf[tokenIdToBurn];
      emit TransferNFT(account, address(0), tokenIdToBurn);
      current -= 1;
    }
  }
}

contract NexCampaignEscrow {
  address public immutable owner;
  address public immutable shareToken;
  address public treasury;
  uint256 public immutable targetBaseUnits;
  uint256 public immutable minContributionBaseUnits;
  uint256 public immutable maxContributionBaseUnits;
  uint256 public raisedBaseUnits;
  bool public finalized;

  event Contribution(address indexed contributor, uint256 amount);
  event Finalized(uint256 raisedBaseUnits, address treasury);

  constructor(
    address _owner,
    address _shareToken,
    address _treasury,
    uint256 _targetBaseUnits,
    uint256 _minContributionBaseUnits,
    uint256 _maxContributionBaseUnits
  ) {
    owner = _owner;
    shareToken = _shareToken;
    treasury = _treasury;
    targetBaseUnits = _targetBaseUnits;
    minContributionBaseUnits = _minContributionBaseUnits;
    maxContributionBaseUnits = _maxContributionBaseUnits;
  }

  function contribute() external payable {
    require(!finalized, "finalized");
    require(msg.value >= minContributionBaseUnits, "below min");
    if (maxContributionBaseUnits > 0) {
      require(msg.value <= maxContributionBaseUnits, "above max");
    }
    raisedBaseUnits += msg.value;
    emit Contribution(msg.sender, msg.value);
  }

  function finalize() external {
    require(msg.sender == owner, "only owner");
    require(!finalized, "finalized");
    finalized = true;
    if (raisedBaseUnits > 0) {
      (bool sent, ) = payable(treasury).call{ value: raisedBaseUnits }("");
      require(sent, "treasury transfer failed");
    }
    emit Finalized(raisedBaseUnits, treasury);
  }
}
`;

  const input = {
    language: "Solidity",
    sources: {
      [SOURCE_FILE]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = Array.isArray(output?.errors) ? output.errors : [];
  const fatal = errors.filter((entry: { severity?: string }) => entry?.severity === "error");
  if (fatal.length > 0) {
    throw new Error("Launchpad contract compilation failed.");
  }

  const shareContractErc20 = output?.contracts?.[SOURCE_FILE]?.[SHARE_CONTRACT_ERC20];
  const shareContractErc404 = output?.contracts?.[SOURCE_FILE]?.[SHARE_CONTRACT_ERC404];
  const escrowContract = output?.contracts?.[SOURCE_FILE]?.[ESCROW_CONTRACT];
  if (!shareContractErc20?.abi || !shareContractErc20?.evm?.bytecode?.object) {
    throw new Error("Missing compiled artifact for ERC20 share token contract.");
  }
  if (!shareContractErc404?.abi || !shareContractErc404?.evm?.bytecode?.object) {
    throw new Error("Missing compiled artifact for ERC404 share token contract.");
  }
  if (!escrowContract?.abi || !escrowContract?.evm?.bytecode?.object) {
    throw new Error("Missing compiled artifact for campaign escrow contract.");
  }

  COMPILED_CACHE = {
    shareTokenErc20: {
      abi: shareContractErc20.abi as UntypedJson,
      bytecode: `0x${shareContractErc20.evm.bytecode.object}` as Hex,
    },
    shareTokenErc404: {
      abi: shareContractErc404.abi as UntypedJson,
      bytecode: `0x${shareContractErc404.evm.bytecode.object}` as Hex,
    },
    campaignEscrow: {
      abi: escrowContract.abi as UntypedJson,
      bytecode: `0x${escrowContract.evm.bytecode.object}` as Hex,
    },
  };
  return COMPILED_CACHE;
}

export function campaignChainRefToEvmChainId(chainRef: string): number {
  return parseChainRefToEvmChainId(chainRef);
}

export async function deployCampaignContracts(params: DeployParams): Promise<DeployResult> {
  const privateKey = resolveCampaignPrivateKey();
  const rpcUrl = resolveRpcUrl(params.chainId);
  const account = privateKeyToAccount(privateKey);
  const artifacts = getCompiledArtifacts();
  const tokenStandard = params.tokenStandard === "erc404" ? "erc404" : "erc20";
  const target = parseBaseUnits(params.targetBaseUnits, "targetBaseUnits");
  const min = parseBaseUnits(params.minContributionBaseUnits, "minContributionBaseUnits");
  const max = params.maxContributionBaseUnits ? parseBaseUnits(params.maxContributionBaseUnits, "maxContributionBaseUnits") : 0n;
  if (max > 0n && max < min) {
    throw new Error("Invalid contribution bounds: max cannot be below min.");
  }

  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });

  const shareDeployData = encodeDeployData({
    abi: (tokenStandard === "erc404" ? artifacts.shareTokenErc404.abi : artifacts.shareTokenErc20.abi) as unknown as readonly unknown[],
    bytecode: tokenStandard === "erc404" ? artifacts.shareTokenErc404.bytecode : artifacts.shareTokenErc20.bytecode,
    args: [params.tokenName, params.tokenSymbol, account.address],
  } as never);
  const shareTokenDeployTxHash = await walletClient.sendTransaction({
    chain: null,
    account,
    data: shareDeployData,
  });
  const shareReceipt = await publicClient.waitForTransactionReceipt({ hash: shareTokenDeployTxHash });
  const shareTokenAddress = shareReceipt.contractAddress;
  if (!shareTokenAddress) {
    throw new Error("Share token deployment did not return contract address.");
  }

  const campaignDeployData = encodeDeployData({
    abi: artifacts.campaignEscrow.abi as unknown as readonly unknown[],
    bytecode: artifacts.campaignEscrow.bytecode,
    args: [account.address, shareTokenAddress, params.treasuryAddress, target, min, max],
  } as never);
  const campaignDeployTxHash = await walletClient.sendTransaction({
    chain: null,
    account,
    data: campaignDeployData,
  });
  const campaignReceipt = await publicClient.waitForTransactionReceipt({ hash: campaignDeployTxHash });
  const campaignAddress = campaignReceipt.contractAddress;
  if (!campaignAddress) {
    throw new Error("Campaign escrow deployment did not return contract address.");
  }

  return {
    shareTokenAddress,
    campaignAddress,
    shareTokenDeployTxHash,
    campaignDeployTxHash,
    deployerAddress: account.address,
  };
}
