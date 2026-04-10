import { logger } from "@/lib/logger";
import { getCdpClient } from "@/server/services/cdp/client";

import type { WalletBalanceResult } from "./types";

type CdpClient = Awaited<ReturnType<typeof getCdpClient>>;

const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOLANA_TOKEN_PROGRAM_ID =
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

async function fetchFromRpc(address: string): Promise<WalletBalanceResult> {
  const { Connection, PublicKey, clusterApiUrl } = await import("@solana/web3.js");

  const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    process.env.HELIUS_RPC_URL ??
    clusterApiUrl("mainnet-beta");

  const connection = new Connection(rpcUrl, "confirmed");
  const publicKey = new PublicKey(address);

  const [lamports, tokenAccounts] = await Promise.all([
    connection.getBalance(publicKey),
    connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey(SOLANA_TOKEN_PROGRAM_ID),
    }),
  ]);

  const tokens = tokenAccounts.value.map((account) => {
    const info = account.account.data.parsed?.info as
      | {
          mint?: string;
          tokenAmount?: {
            amount?: string;
            decimals?: number;
          };
        }
      | undefined;

    return {
      symbol: null,
      address: info?.mint ?? "unknown",
      balance: info?.tokenAmount?.amount ?? "0",
      usdValue: 0,
      decimals: info?.tokenAmount?.decimals ?? 9,
      name: null,
    };
  });

  return {
    address,
    platform: "solana",
    native: {
      symbol: "SOL",
      balance: String(lamports),
      usdValue: 0,
      decimals: 9,
    },
    tokens,
    totalUsdValue: 0,
  };
}

export async function fetchSolanaBalances(
  cdp: CdpClient,
  address: string,
): Promise<WalletBalanceResult> {
  if (!SOLANA_ADDRESS_PATTERN.test(address)) {
    throw new Error("Invalid Solana address format");
  }

  if (!cdp) {
    return fetchFromRpc(address);
  }

  try {
    const result = await cdp.solana.listTokenBalances({ address });
    const balances = result.balances ?? [];
    let native = {
      symbol: "SOL",
      balance: "0",
      usdValue: 0,
      decimals: 9,
    };
    const tokens: WalletBalanceResult["tokens"] = [];

    for (const balance of balances) {
      const mintAddress =
        (balance as { token?: { mintAddress?: string } }).token?.mintAddress ??
        "native";
      const amount = String(
        (balance as { amount?: { amount?: bigint } }).amount?.amount ?? "0",
      );
      const decimals = Number(
        (balance as { amount?: { decimals?: number } }).amount?.decimals ?? 9,
      );
      const isNative =
        mintAddress === "native" ||
        mintAddress === "" ||
        mintAddress === WRAPPED_SOL_MINT;

      if (isNative) {
        native = {
          symbol:
            (balance as { token?: { symbol?: string } }).token?.symbol ?? "SOL",
          balance: amount,
          usdValue: 0,
          decimals,
        };
        continue;
      }

      tokens.push({
        symbol:
          (balance as { token?: { symbol?: string } }).token?.symbol ?? null,
        address: mintAddress,
        balance: amount,
        usdValue: 0,
        decimals,
        name: (balance as { token?: { name?: string } }).token?.name ?? null,
      });
    }

    return {
      address,
      platform: "solana",
      native,
      tokens,
      totalUsdValue: 0,
    };
  } catch (error) {
    logger.warn("cdp_balance_cdp_solana_fetch_failed", {
      address,
      error: error instanceof Error ? error.message : String(error),
    });
    return fetchFromRpc(address);
  }
}
