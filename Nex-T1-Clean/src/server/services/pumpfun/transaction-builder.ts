import "server-only";

import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
} from "@solana/web3.js";

import {
  getDefaultPriorityFees,
  getPumpFunConnection,
  getPumpFunSdk,
  type PumpFunCluster,
  type PumpFunPriorityFee,
} from "@/modules/wallets/pumpfun/service";

function toLamports(amountSol: number): bigint {
  return BigInt(Math.round(amountSol * 1_000_000_000));
}

function normalizeSlippageBps(value?: number): bigint {
  return BigInt(Math.max(1, Math.trunc(value ?? 500)));
}

function applyPriorityFees(
  transaction: Transaction,
  priorityFees?: PumpFunPriorityFee,
) {
  if (!priorityFees) {
    return transaction;
  }

  const next = new Transaction();
  if (typeof priorityFees.unitLimit === "number" && priorityFees.unitLimit > 0) {
    next.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: priorityFees.unitLimit,
      }),
    );
  }
  if (typeof priorityFees.unitPrice === "number" && priorityFees.unitPrice > 0) {
    next.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFees.unitPrice,
      }),
    );
  }
  next.add(...transaction.instructions);
  return next;
}

async function finalizeUnsignedTransaction(params: {
  cluster: PumpFunCluster;
  owner: PublicKey;
  transaction: Transaction;
}) {
  const connection = await getPumpFunConnection(params.cluster);
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  params.transaction.feePayer = params.owner;
  params.transaction.recentBlockhash = latestBlockhash.blockhash;

  return {
    transaction: params.transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64"),
    recentBlockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  };
}

export async function buildPumpfunBuyTransaction(params: {
  cluster?: PumpFunCluster;
  buyerAddress: string;
  mint: string;
  amountSol: number;
  slippageBps?: number;
  priorityFees?: PumpFunPriorityFee | null;
}) {
  const cluster = params.cluster ?? "mainnet-beta";
  const sdk = await getPumpFunSdk(cluster);
  const buyer = new PublicKey(params.buyerAddress);
  const mint = new PublicKey(params.mint);

  const baseTransaction = await sdk.getBuyInstructionsBySolAmount(
    buyer,
    mint,
    toLamports(params.amountSol),
    normalizeSlippageBps(params.slippageBps),
  );

  const prioritizedTransaction = applyPriorityFees(
    baseTransaction,
    params.priorityFees ?? getDefaultPriorityFees(cluster),
  );

  const finalized = await finalizeUnsignedTransaction({
    cluster,
    owner: buyer,
    transaction: prioritizedTransaction,
  });

  return {
    ...finalized,
    mint: mint.toBase58(),
    amountSol: params.amountSol,
    buyerAddress: buyer.toBase58(),
    cluster,
  };
}

export async function getSolanaTokenHolding(params: {
  cluster?: PumpFunCluster;
  ownerAddress: string;
  mint: string;
}) {
  const cluster = params.cluster ?? "mainnet-beta";
  const connection = await getPumpFunConnection(cluster);
  const owner = new PublicKey(params.ownerAddress);
  const mint = new PublicKey(params.mint);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
    mint,
  });

  let amountRaw = 0n;
  let decimals = 0;

  for (const account of tokenAccounts.value) {
    const parsedInfo = account.account.data.parsed?.info as
      | {
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmountString?: string;
          };
        }
      | undefined;
    const tokenAmount = parsedInfo?.tokenAmount;
    if (!tokenAmount?.amount) {
      continue;
    }
    amountRaw += BigInt(tokenAmount.amount);
    if (typeof tokenAmount.decimals === "number") {
      decimals = tokenAmount.decimals;
    }
  }

  return {
    mint: mint.toBase58(),
    ownerAddress: owner.toBase58(),
    cluster,
    amountRaw,
    decimals,
    uiAmount:
      decimals > 0
        ? Number(amountRaw) / 10 ** decimals
        : Number(amountRaw),
  };
}

export async function buildPumpfunSellTransaction(params: {
  cluster?: PumpFunCluster;
  sellerAddress: string;
  mint: string;
  tokenAmountRaw: bigint;
  slippageBps?: number;
  priorityFees?: PumpFunPriorityFee | null;
}) {
  const cluster = params.cluster ?? "mainnet-beta";
  const sdk = await getPumpFunSdk(cluster);
  const seller = new PublicKey(params.sellerAddress);
  const mint = new PublicKey(params.mint);

  const baseTransaction = await sdk.getSellInstructionsByTokenAmount(
    seller,
    mint,
    params.tokenAmountRaw,
    normalizeSlippageBps(params.slippageBps),
  );

  const prioritizedTransaction = applyPriorityFees(
    baseTransaction,
    params.priorityFees ?? getDefaultPriorityFees(cluster),
  );

  const finalized = await finalizeUnsignedTransaction({
    cluster,
    owner: seller,
    transaction: prioritizedTransaction,
  });

  return {
    ...finalized,
    mint: mint.toBase58(),
    sellerAddress: seller.toBase58(),
    tokenAmountRaw: params.tokenAmountRaw.toString(),
    cluster,
  };
}
