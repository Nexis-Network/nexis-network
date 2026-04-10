"use client";

import { CDP_EMBEDDED_ENABLED } from "@/lib/cdp/feature-flag";
/**
 * Unified CDP transaction hooks for EVM (Smart Account) and Solana.
 *
 * CdpProvider always mounts either the live Coinbase provider or a mock
 * provider so the underlying hook graph stays identical across renders.
 * When the feature flag is off, this hook still resolves Coinbase hooks
 * through the mock provider and then returns stable no-op wrappers.
 *
 * The inner hook resolves account addresses from CDP state hooks
 * (useEvmAddress, useSolanaAddress, useEvmSmartAccounts) and injects
 * them into each transaction function call automatically.
 */

// ---------------------------------------------------------------------------
// Types (mirror CDP core types for consumers that don't import CDP directly)
// ---------------------------------------------------------------------------

export type CdpEvmSendResult = {
  /** ERC-4337 UserOperation hash (Smart Account) */
  userOperationHash?: string;
};

export type CdpEvmTxResult = {
  /** On-chain transaction hash (EOA) */
  transactionHash: string;
};

export type CdpSolanaSendResult = {
  transactionSignature: string;
};

export type CdpSignResult = {
  signature: string;
};

export type CdpTransactions = {
  /** True when CDP feature flag is enabled */
  enabled: boolean;
  /** Resolved Smart Account address (null if not signed in) */
  evmSmartAccount: string | null;
  /** Resolved EVM EOA address (null if not signed in) */
  evmAddress: string | null;
  /** Resolved Solana address (null if not signed in) */
  solanaAddress: string | null;

  /** Send EVM transaction via Smart Account (UserOperation). Preferred for Nex Wallets. */
  sendEvmUserOperation: (params: {
    calls: Array<{ to: string; value?: bigint; data?: string }>;
    network?: string;
  }) => Promise<CdpEvmSendResult>;

  /** Send raw EVM transaction (EOA fallback). Requires TransactionSerializableEIP1559 shape. */
  sendEvmTransaction: (params: {
    to: string;
    value?: bigint;
    data?: string;
    chainId: number;
    network?: string;
  }) => Promise<CdpEvmTxResult>;

  /** Send Solana transaction (base64-encoded serialized transaction) */
  sendSolanaTransaction: (params: {
    transaction: string;
    network?: string;
  }) => Promise<CdpSolanaSendResult>;

  /** Sign an EVM message */
  signEvmMessage: (params: { message: string }) => Promise<CdpSignResult>;
  /** Sign a pre-hashed EVM digest */
  signEvmHash: (params: { hash: `0x${string}` }) => Promise<CdpSignResult>;
  /** Sign EIP-712 typed data */
  signEvmTypedData: (params: { typedData: unknown }) => Promise<CdpSignResult>;
  /** Sign a Solana message (base64-encoded) */
  signSolanaMessage: (params: { message: string }) => Promise<CdpSignResult>;
};

// ---------------------------------------------------------------------------
// No-op fallback when CDP is disabled
// ---------------------------------------------------------------------------

const CDP_DISABLED_ERROR = "Nex Wallets are not enabled";

const noopResult: CdpTransactions = {
  enabled: false,
  evmSmartAccount: null,
  evmAddress: null,
  solanaAddress: null,
  sendEvmUserOperation: () => Promise.reject(new Error(CDP_DISABLED_ERROR)),
  sendEvmTransaction: () => Promise.reject(new Error(CDP_DISABLED_ERROR)),
  sendSolanaTransaction: () => Promise.reject(new Error(CDP_DISABLED_ERROR)),
  signEvmMessage: () => Promise.reject(new Error(CDP_DISABLED_ERROR)),
  signEvmHash: () => Promise.reject(new Error(CDP_DISABLED_ERROR)),
  signEvmTypedData: () => Promise.reject(new Error(CDP_DISABLED_ERROR)),
  signSolanaMessage: () => Promise.reject(new Error(CDP_DISABLED_ERROR)),
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_EVM_NETWORK = "base";
const DEFAULT_SOLANA_NETWORK = "solana";

// ---------------------------------------------------------------------------
// Inner hook backed by either the live or mock CDP provider
// ---------------------------------------------------------------------------

function useCdpTransactionsInner(): CdpTransactions {
  const hooks = require("@coinbase/cdp-hooks") as typeof import("@coinbase/cdp-hooks");

  // Resolve account addresses from CDP auth state
  const { evmAddress } = hooks.useEvmAddress();
  const { solanaAddress } = hooks.useSolanaAddress();
  const { evmSmartAccounts } = hooks.useEvmSmartAccounts();

  // The first smart account is the primary one
  const smartAccount = evmSmartAccounts?.[0]?.address ?? null;

  // Transaction hooks
  const { sendUserOperation } = hooks.useSendUserOperation();
  const { sendEvmTransaction: rawSendEvmTx } = hooks.useSendEvmTransaction();
  const { sendSolanaTransaction: rawSendSolTx } = hooks.useSendSolanaTransaction();
  const { signEvmMessage: rawSignEvmMsg } = hooks.useSignEvmMessage();
  const { signEvmHash: rawSignEvmHash } = hooks.useSignEvmHash();
  const { signEvmTypedData: rawSignTypedData } = hooks.useSignEvmTypedData();
  const { signSolanaMessage: rawSignSolMsg } = hooks.useSignSolanaMessage();

  return {
    enabled: true,
    evmSmartAccount: smartAccount,
    evmAddress: evmAddress ?? null,
    solanaAddress: solanaAddress ?? null,

    sendEvmUserOperation: async (params) => {
      if (!smartAccount) {
        throw new Error("No Nex Wallet (EVM) available. Ensure the user is signed in.");
      }
      const network = (params.network ?? DEFAULT_EVM_NETWORK) as Parameters<typeof sendUserOperation>[0]["network"];
      const result = await sendUserOperation({
        evmSmartAccount: smartAccount as `0x${string}`,
        network,
        calls: params.calls.map((c) => ({
          to: c.to as `0x${string}`,
          value: c.value,
          data: c.data as `0x${string}` | undefined,
        })),
      });
      return { userOperationHash: result.userOperationHash };
    },

    sendEvmTransaction: async (params) => {
      if (!evmAddress) {
        throw new Error("No Nex Wallet (EVM) available. Ensure the user is signed in.");
      }
      const network = (params.network ?? DEFAULT_EVM_NETWORK) as Parameters<typeof rawSendEvmTx>[0]["network"];
      const result = await rawSendEvmTx({
        evmAccount: evmAddress as `0x${string}`,
        network,
        transaction: {
          to: params.to as `0x${string}`,
          value: params.value,
          data: params.data as `0x${string}` | undefined,
          chainId: params.chainId,
          type: "eip1559" as const,
        },
      });
      return { transactionHash: result.transactionHash };
    },

    sendSolanaTransaction: async (params) => {
      if (!solanaAddress) {
        throw new Error("No Nex Wallet (SOL) available. Ensure the user is signed in.");
      }
      const network = (params.network ?? DEFAULT_SOLANA_NETWORK) as Parameters<typeof rawSendSolTx>[0]["network"];
      const result = await rawSendSolTx({
        solanaAccount: solanaAddress,
        network,
        transaction: params.transaction,
      });
      return { transactionSignature: result.transactionSignature };
    },

    signEvmMessage: async (params) => {
      if (!evmAddress) {
        throw new Error("No Nex Wallet (EVM) available. Ensure the user is signed in.");
      }
      const result = await rawSignEvmMsg({
        evmAccount: evmAddress as `0x${string}`,
        message: params.message,
      });
      return { signature: result.signature };
    },

    signEvmHash: async (params) => {
      const signingAccount = smartAccount ?? evmAddress;
      if (!signingAccount) {
        throw new Error("No Nex Wallet (EVM) available. Ensure the user is signed in.");
      }
      const result = await rawSignEvmHash({
        evmAccount: signingAccount as `0x${string}`,
        hash: params.hash,
      });
      return { signature: result.signature };
    },

    signEvmTypedData: async (params) => {
      if (!evmAddress) {
        throw new Error("No Nex Wallet (EVM) available. Ensure the user is signed in.");
      }
      const result = await rawSignTypedData({
        evmAccount: evmAddress as `0x${string}`,
        typedData: params.typedData as Parameters<typeof rawSignTypedData>[0]["typedData"],
      });
      return { signature: result.signature };
    },

    signSolanaMessage: async (params) => {
      if (!solanaAddress) {
        throw new Error("No Nex Wallet (SOL) available. Ensure the user is signed in.");
      }
      const result = await rawSignSolMsg({
        solanaAccount: solanaAddress,
        message: params.message,
      });
      return { signature: result.signature };
    },
  };
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

export function useCdpTransactions(): CdpTransactions {
  const transactions = useCdpTransactionsInner();

  if (!CDP_EMBEDDED_ENABLED) {
    return noopResult;
  }

  return transactions;
}
