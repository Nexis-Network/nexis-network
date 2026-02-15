/**
 * useCrossmintWallet Hook
 *
 * Bridges the Crossmint SDK's `useWallet` React hook with the domain-layer
 * onboarding and wallet stores. Orchestrates multi-chain smart wallet
 * creation during the onboarding flow.
 *
 * This hook calls `getOrCreateWallet({ chain })` from the Crossmint SDK for
 * each target chain, maps the result to a domain `Wallet` entity, and updates
 * both the onboarding store (progress tracking) and the wallet store (wallet
 * list).
 */

import { useCallback } from 'react';

import { useWallet as useCrossmintSdkWallet } from '@crossmint/client-sdk-react-native-ui';
import type { Chain, Wallet as CrossmintSdkWalletType } from '@crossmint/wallets-sdk';

/** Shorthand for the Crossmint SDK wallet resolved from getOrCreateWallet. */
type CrossmintSdkWallet = CrossmintSdkWalletType<Chain>;

import type { ChainType } from '@domain/wallet/entities/wallet';
import {
  CHAIN_MAP,
  mapCrossmintWalletToDomain,
} from '@infrastructure/wallet/crossmint-adapter';
import { useOnboardingStore } from '@application/stores/onboarding-store';
import { useWalletStore } from '@application/stores/wallet-store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Chains to provision during onboarding. */
const TARGET_CHAINS: ReadonlyArray<ChainType> = ['evm', 'solana', 'stellar'];

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseCrossmintWalletReturn {
  /** Create wallets for all target chains. */
  readonly createAllWallets: () => Promise<void>;
  /** Retry wallet creation for a single failed chain. */
  readonly retryChain: (chain: ChainType) => Promise<void>;
  /** Whether wallet creation is in progress. */
  readonly isCreating: boolean;
  /** Chains successfully created so far. */
  readonly walletsCreated: ReadonlyArray<ChainType>;
  /** Chains that failed creation. */
  readonly failedChains: ReadonlyArray<ChainType>;
  /** Last error message, or null. */
  readonly error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCrossmintWallet(): UseCrossmintWalletReturn {
  const { getOrCreateWallet } = useCrossmintSdkWallet();

  // --- Onboarding store ---
  const isCreating = useOnboardingStore((s) => s.isCreating);
  const walletsCreated = useOnboardingStore((s) => s.walletsCreated);
  const failedChains = useOnboardingStore((s) => s.failedChains);
  const error = useOnboardingStore((s) => s.error);
  const setCreating = useOnboardingStore((s) => s.setCreating);
  const setError = useOnboardingStore((s) => s.setError);
  const markWalletCreated = useOnboardingStore((s) => s.markWalletCreated);
  const markWalletFailed = useOnboardingStore((s) => s.markWalletFailed);

  // --- Wallet store ---
  const addWallet = useWalletStore((s) => s.addWallet);

  // --- Create a single chain wallet ---
  const createChainWallet = useCallback(
    async (chainType: ChainType): Promise<void> => {
      try {
        // The CrossmintWalletProvider injects the signer configuration at
        // the provider level. We cast the args because the provider-level
        // signer satisfies the SDK's `WalletArgsFor<C>` requirement at
        // runtime, but TypeScript cannot infer this from the hook context.
        const cmWallet = await (getOrCreateWallet as (
          props: { chain: Chain },
        ) => Promise<CrossmintSdkWallet | undefined>)({
          chain: CHAIN_MAP[chainType] as Chain,
        });

        if (cmWallet == null) {
          throw new Error(`Crossmint returned no wallet for chain: ${chainType}`);
        }

        const domainWallet = mapCrossmintWalletToDomain({
          address: cmWallet.address,
          chain: chainType,
          walletId: cmWallet.address,
        });

        addWallet(domainWallet);
        markWalletCreated(chainType);
      } catch (err) {
        markWalletFailed(chainType);
        throw err;
      }
    },
    [getOrCreateWallet, addWallet, markWalletCreated, markWalletFailed],
  );

  // --- Create all wallets ---
  const createAllWallets = useCallback(async (): Promise<void> => {
    setCreating(true);

    let lastError: string | null = null;

    for (const chainType of TARGET_CHAINS) {
      try {
        await createChainWallet(chainType);
      } catch (err) {
        lastError =
          err instanceof Error ? err.message : `Failed to create ${chainType} wallet`;
      }
    }

    if (lastError) {
      setError(lastError);
    } else {
      setCreating(false);
    }
  }, [createChainWallet, setCreating, setError]);

  // --- Retry a single failed chain ---
  const retryChain = useCallback(
    async (chain: ChainType): Promise<void> => {
      setCreating(true);

      try {
        await createChainWallet(chain);
        setCreating(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `Failed to create ${chain} wallet`,
        );
      }
    },
    [createChainWallet, setCreating, setError],
  );

  return {
    createAllWallets,
    retryChain,
    isCreating,
    walletsCreated,
    failedChains,
    error,
  };
}
