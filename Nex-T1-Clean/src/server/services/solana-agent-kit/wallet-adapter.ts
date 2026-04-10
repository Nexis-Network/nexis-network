import "server-only";

import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  type Connection,
  type SendOptions,
  type TransactionSignature,
} from "@solana/web3.js";
import type { BaseWallet } from "solana-agent-kit";

import { sendCdpEmbeddedSolanaTransaction } from "@/server/services/cdp/embedded-solana-transactions";
import { verifyCdpWalletOwnership } from "@/server/services/cdp/ownership";

const READONLY_WALLET_ADDRESS = "11111111111111111111111111111111";

function serializeTransactionForCdp(
  transaction: Transaction | VersionedTransaction,
): string {
  if (transaction instanceof VersionedTransaction) {
    return Buffer.from(transaction.serialize()).toString("base64");
  }

  return transaction
    .serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    .toString("base64");
}

export class CdpSolanaEmbeddedWalletAdapter implements BaseWallet {
  readonly publicKey: PublicKey;

  private readonly userId: string;
  private readonly walletAddress: string | null;
  private ownershipValidated = false;

  constructor({
    userId,
    walletAddress,
  }: {
    userId: string;
    walletAddress?: string | null;
  }) {
    this.userId = userId;
    this.walletAddress = walletAddress?.trim() || null;
    this.publicKey = new PublicKey(this.walletAddress ?? READONLY_WALLET_ADDRESS);
  }

  canTransact(): boolean {
    return Boolean(this.walletAddress);
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T> {
    // AgentKit signs many flows locally before broadcasting. For CDP-backed
    // embedded wallets we leave the wallet signature blank and hand the
    // serialized transaction to CDP for final signing + broadcast.
    return transaction;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ): Promise<T[]> {
    return transactions;
  }

  async sendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<string> {
    const result = await this.signAndSendTransaction(transaction);
    return result.signature;
  }

  async signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    _options?: SendOptions,
  ): Promise<{ signature: TransactionSignature }> {
    if (!this.walletAddress) {
      throw new Error("A Solana Nex Wallet is required for state-changing Solana AgentKit actions.");
    }

    await this.assertOwnership();

    const serialized = serializeTransactionForCdp(transaction);
    const result = await sendCdpEmbeddedSolanaTransaction({
      userId: this.userId,
      walletAddress: this.walletAddress,
      transaction: serialized,
      network: "solana",
    });

    return {
      signature: result.transactionSignature as TransactionSignature,
    };
  }

  async signMessage(_message: Uint8Array): Promise<Uint8Array> {
    throw new Error(
      "CDP-backed Solana AgentKit message signing is not supported on the server runtime yet.",
    );
  }

  private async assertOwnership(): Promise<void> {
    if (this.ownershipValidated || !this.walletAddress) {
      return;
    }

    const isOwner = await verifyCdpWalletOwnership(this.userId, this.walletAddress);
    if (!isOwner) {
      throw new Error("The requested Solana Nex Wallet is not linked to the authenticated user.");
    }

    this.ownershipValidated = true;
  }
}

export function patchSolanaAgentKitConnection(
  connection: Connection,
  wallet: CdpSolanaEmbeddedWalletAdapter,
): void {
  const originalSendTransaction = connection.sendTransaction.bind(connection);

  connection.sendTransaction = (async (...args: Parameters<Connection["sendTransaction"]>) => {
    const [transaction] = args;

    if (!(transaction instanceof Transaction || transaction instanceof VersionedTransaction)) {
      return originalSendTransaction(...args);
    }

    if (!wallet.canTransact()) {
      return originalSendTransaction(...args);
    }

    const result = await wallet.signAndSendTransaction(transaction);
    return result.signature;
  }) as Connection["sendTransaction"];
}
