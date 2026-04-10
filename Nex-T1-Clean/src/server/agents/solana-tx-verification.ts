import { PublicKey } from "@solana/web3.js";

import { normalizeAssetId, parseBaseUnits } from "@/server/agents/campaign";

type VerifySolanaTransactionOptions = {
  networkId: string;
  txHash: string;
  assetId?: string | null;
  expectedTo?: string | null;
  minValueBaseUnits?: string | null;
};

type SolanaRpcResult = {
  result?: {
    meta?: {
      err?: UntypedJson;
      innerInstructions?: Array<{
        instructions?: Array<{
          parsed?: UntypedJson;
          program?: string;
        }>;
      }>;
    };
    transaction?: {
      message?: {
        instructions?: Array<{
          parsed?: UntypedJson;
          program?: string;
        }>;
      };
    };
  } | null;
  error?: {
    message?: string;
  };
};

function parseSolanaReference(networkId: string): number {
  const match = /^solana:(\d+)$/.exec(networkId.trim());
  if (!match) {
    throw new Error("Invalid Solana networkId. Expected CAIP-2 format: solana:<clusterId>.");
  }
  return Number(match[1]);
}

function parseSplAsset(assetId: string, networkRef: number): string {
  const match = /^solana:(\d+)\/spl:([1-9A-HJ-NP-Za-km-z]{32,44})$/.exec(assetId.trim());
  if (!match) {
    throw new Error("Invalid Solana SPL asset id. Expected: solana:<clusterId>/spl:<mintAddress>.");
  }
  if (Number(match[1]) !== networkRef) {
    throw new Error("SPL asset chain does not match transaction network.");
  }
  return match[2];
}

function resolveSolanaRpcUrl(): string {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC?.trim();
  if (!rpcUrl) {
    throw new Error("Missing Solana RPC URL. Set NEXT_PUBLIC_RPC.");
  }
  return rpcUrl;
}

function assertBase58(value: string, field: string): void {
  const normalized = value.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(normalized)) {
    throw new Error(`Invalid ${field} format.`);
  }
}

type ParsedInstruction = {
  parsed?: {
    type?: string;
    info?: Record<string, UntypedJson>;
  };
  program?: string;
};

function collectInstructions(payload: SolanaRpcResult["result"]): ParsedInstruction[] {
  const top = payload?.transaction?.message?.instructions ?? [];
  const inner = payload?.meta?.innerInstructions
    ?.flatMap((entry) => entry.instructions ?? [])
    .map((item) => ({
      parsed: (typeof item.parsed === "object" && item.parsed ? item.parsed : undefined) as ParsedInstruction["parsed"],
      program: typeof item.program === "string" ? item.program : undefined,
    })) ?? [];
  const topTyped = top.map((item) => ({
    parsed: (typeof item.parsed === "object" && item.parsed ? item.parsed : undefined) as ParsedInstruction["parsed"],
    program: typeof item.program === "string" ? item.program : undefined,
  }));
  return [...topTyped, ...inner];
}

function toBigIntAmount(value: UntypedJson): bigint | null {
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return BigInt(Math.trunc(value));
  return null;
}

export async function verifySolanaTransaction(options: VerifySolanaTransactionOptions): Promise<void> {
  const networkRef = parseSolanaReference(options.networkId);
  assertBase58(options.txHash, "Solana transaction signature");
  if (options.expectedTo) {
    assertBase58(options.expectedTo, "Solana destination address");
    void new PublicKey(options.expectedTo);
  }
  const rpcUrl = resolveSolanaRpcUrl();
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [options.txHash, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Solana RPC request failed (${response.status}).`);
  }

  const payload = (await response.json()) as SolanaRpcResult;
  if (payload.error?.message) {
    throw new Error(`Solana RPC error: ${payload.error.message}`);
  }
  if (!payload.result) {
    throw new Error("Solana transaction not found.");
  }
  if (payload.result.meta?.err) {
    throw new Error("Solana transaction failed on-chain.");
  }

  const asset = normalizeAssetId(options.assetId);
  const minValue = options.minValueBaseUnits ? parseBaseUnits(options.minValueBaseUnits) : null;
  if (!minValue && !options.expectedTo && asset === "native") {
    return;
  }

  const instructions = collectInstructions(payload.result);
  if (asset === "native") {
    const matched = instructions.some((instruction) => {
      if (instruction.program !== "system") return false;
      const type = instruction.parsed?.type;
      if (type !== "transfer") return false;
      const info = instruction.parsed?.info;
      if (!info) return false;
      const destination = typeof info.destination === "string" ? info.destination : null;
      if (options.expectedTo && destination !== options.expectedTo) return false;
      const lamports = toBigIntAmount(info.lamports);
      if (lamports === null) return false;
      if (minValue !== null && lamports < minValue) return false;
      return true;
    });
    if (!matched) {
      throw new Error("Unable to verify native SOL transfer details from transaction.");
    }
    return;
  }

  const mint = parseSplAsset(asset, networkRef);
  const matched = instructions.some((instruction) => {
    if (instruction.program !== "spl-token" && instruction.program !== "spl-token-2022") return false;
    const type = instruction.parsed?.type;
    if (type !== "transfer" && type !== "transferChecked") return false;
    const info = instruction.parsed?.info;
    if (!info) return false;
    const destination = typeof info.destination === "string" ? info.destination : null;
    if (options.expectedTo && destination !== options.expectedTo) return false;

    const parsedMint = typeof info.mint === "string" ? info.mint : null;
    if (parsedMint && parsedMint !== mint) return false;

    const amount =
      typeof info.tokenAmount === "object" && info.tokenAmount
        ? toBigIntAmount((info.tokenAmount as Record<string, UntypedJson>).amount)
        : toBigIntAmount(info.amount);
    if (amount === null) return false;
    if (minValue !== null && amount < minValue) return false;
    return true;
  });
  if (!matched) {
    throw new Error("Unable to verify SPL token transfer details from transaction.");
  }
}
