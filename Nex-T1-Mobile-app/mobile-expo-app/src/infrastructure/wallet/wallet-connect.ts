/**
 * WalletConnect v2 adapter for React Native (mobile deep-link flow).
 *
 * Uses the WC modal bridge to open the @walletconnect/modal-react-native
 * wallet picker. On mobile, the modal shows installed wallet apps (MetaMask,
 * Trust Wallet, Phantom, etc.) and deep-links to them — no QR code.
 *
 * The modal manages the EthereumProvider lifecycle internally. This adapter
 * is a thin wrapper that converts WC operations into domain `Result` types
 * and persists session state in expo-secure-store.
 *
 * SECURITY NOTES:
 * - Session topic is stored in SecureStore, never in plain AsyncStorage.
 * - No private key material ever enters JS memory; all signing is delegated
 *   to the remote wallet application via deep link.
 * - Session data is wiped on explicit disconnect and on auth logout.
 */

import * as SecureStore from 'expo-secure-store';

import type { Wallet } from '@domain/wallet/entities/wallet';
import { WalletError } from '@domain/common/errors/domain-error';
import {
  type Result,
  success,
  failure,
  createUUID,
} from '@domain/common/types';

import { wcModalBridge, type WCProvider } from './wc-modal-bridge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECURE_STORE_ADDRESS_KEY = 'wc_session_address';
const SECURE_STORE_CHAIN_KEY = 'wc_session_chain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WalletConnectSession {
  readonly address: string;
  readonly chainId: number;
}

type SessionEventHandler = (session: WalletConnectSession | null) => void;

// ---------------------------------------------------------------------------
// WalletConnect adapter
// ---------------------------------------------------------------------------

export class WalletConnectAdapter {
  private currentSession: WalletConnectSession | null = null;
  private listeners: Set<SessionEventHandler> = new Set();

  constructor() {
    // Restore any persisted session on instantiation.
    void this.restoreSession();

    // Listen for connection changes from the modal bridge.
    wcModalBridge.onConnectionChange((connected) => {
      if (!connected) {
        this.currentSession = null;
        void this.clearPersistedSession();
        this.notifyListeners(null);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Connection
  // -----------------------------------------------------------------------

  /**
   * Open the wallet selection modal and wait for the user to connect.
   *
   * On mobile, this shows a list of installed wallet apps. The user taps
   * one, the app deep-links to it, the user approves, and the wallet app
   * returns to Nex T1 via the `nex-t1://` URL scheme.
   */
  async connect(): Promise<Result<Wallet, WalletError>> {
    try {
      // Open the modal — this blocks until the user connects or dismisses.
      await wcModalBridge.open();

      // After the modal resolves, check if we got a connection.
      const address = wcModalBridge.getAddress();
      if (!address) {
        return failure(new WalletError('User dismissed the wallet selector'));
      }

      // Build the session from the bridge state.
      const provider = wcModalBridge.getProvider();
      const chainId = await this.resolveChainId(provider);

      const session: WalletConnectSession = { address, chainId };
      this.currentSession = session;
      await this.persistSession(session);
      this.notifyListeners(session);

      return success(sessionToWallet(session));
    } catch (err) {
      if (isUserRejection(err)) {
        return failure(new WalletError('User rejected the connection request'));
      }
      return failure(
        new WalletError(
          `WalletConnect connection failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  /**
   * Cleanly disconnect the current session and wipe persisted data.
   */
  async disconnect(): Promise<Result<void, WalletError>> {
    try {
      const provider = wcModalBridge.getProvider();
      if (provider?.session) {
        await provider.disconnect();
      }

      this.currentSession = null;
      await this.clearPersistedSession();
      this.notifyListeners(null);

      return success(undefined);
    } catch (err) {
      return failure(
        new WalletError(
          `Disconnect failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  // -----------------------------------------------------------------------
  // Signing
  // -----------------------------------------------------------------------

  /**
   * Request a `personal_sign` from the connected wallet.
   *
   * On mobile, this deep-links back to the wallet app for approval.
   * No private key material enters the JS runtime.
   */
  async signMessage(message: string): Promise<Result<string, WalletError>> {
    if (!this.currentSession) {
      return failure(new WalletError('No active WalletConnect session'));
    }

    const provider = wcModalBridge.getProvider();
    if (!provider) {
      return failure(new WalletError('WalletConnect provider not available'));
    }

    try {
      const signature = await provider.request<string>({
        method: 'personal_sign',
        params: [
          stringToHex(message),
          this.currentSession.address,
        ],
      });

      return success(signature);
    } catch (err) {
      if (isUserRejection(err)) {
        return failure(new WalletError('User rejected the signing request'));
      }
      return failure(
        new WalletError(
          `Signing failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  /**
   * Send a transaction through the connected wallet via `eth_sendTransaction`.
   * Returns the transaction hash on success.
   */
  async sendTransaction(params: {
    readonly to: string;
    readonly value: string;
    readonly data?: string;
    readonly gasLimit?: string;
  }): Promise<Result<string, WalletError>> {
    if (!this.currentSession) {
      return failure(new WalletError('No active WalletConnect session'));
    }

    const provider = wcModalBridge.getProvider();
    if (!provider) {
      return failure(new WalletError('WalletConnect provider not available'));
    }

    try {
      const txHash = await provider.request<string>({
        method: 'eth_sendTransaction',
        params: [
          {
            from: this.currentSession.address,
            to: params.to,
            value: params.value,
            data: params.data ?? '0x',
            gas: params.gasLimit,
          },
        ],
      });

      return success(txHash);
    } catch (err) {
      if (isUserRejection(err)) {
        return failure(new WalletError('User rejected the transaction'));
      }
      return failure(
        new WalletError(
          `Transaction failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  // -----------------------------------------------------------------------
  // Chain switching
  // -----------------------------------------------------------------------

  async switchChain(chainId: number): Promise<Result<void, WalletError>> {
    const provider = wcModalBridge.getProvider();
    if (!provider) {
      return failure(new WalletError('WalletConnect provider not available'));
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      if (this.currentSession) {
        const updated: WalletConnectSession = {
          ...this.currentSession,
          chainId,
        };
        this.currentSession = updated;
        await this.persistSession(updated);
        this.notifyListeners(updated);
      }

      return success(undefined);
    } catch (err) {
      return failure(
        new WalletError(
          `Chain switch failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getSession(): WalletConnectSession | null {
    return this.currentSession;
  }

  getAddress(): string | null {
    return this.currentSession?.address ?? wcModalBridge.getAddress();
  }

  getChainId(): number | null {
    return this.currentSession?.chainId ?? null;
  }

  isConnected(): boolean {
    return wcModalBridge.isConnected();
  }

  // -----------------------------------------------------------------------
  // Event listeners
  // -----------------------------------------------------------------------

  onSessionChange(handler: SessionEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private notifyListeners(session: WalletConnectSession | null): void {
    for (const handler of this.listeners) {
      try {
        handler(session);
      } catch {
        // Swallow listener errors to avoid cascading failures.
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async resolveChainId(provider: WCProvider | null): Promise<number> {
    if (!provider) return 1; // Default to Ethereum mainnet

    try {
      const chainIdHex = await provider.request<string>({
        method: 'eth_chainId',
      });
      return parseInt(chainIdHex, 16) || 1;
    } catch {
      return 1;
    }
  }

  // -----------------------------------------------------------------------
  // SecureStore session persistence
  // -----------------------------------------------------------------------

  private async persistSession(session: WalletConnectSession): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        SECURE_STORE_ADDRESS_KEY,
        session.address,
      );
      await SecureStore.setItemAsync(
        SECURE_STORE_CHAIN_KEY,
        String(session.chainId),
      );
    } catch {
      // SecureStore write failures are non-fatal.
    }
  }

  private async restoreSession(): Promise<void> {
    try {
      const address = await SecureStore.getItemAsync(SECURE_STORE_ADDRESS_KEY);
      const chainStr = await SecureStore.getItemAsync(SECURE_STORE_CHAIN_KEY);

      if (address && chainStr) {
        this.currentSession = {
          address,
          chainId: Number(chainStr),
        };
        this.notifyListeners(this.currentSession);
      }
    } catch {
      // If SecureStore read fails we start with no session.
    }
  }

  private async clearPersistedSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_ADDRESS_KEY);
      await SecureStore.deleteItemAsync(SECURE_STORE_CHAIN_KEY);
    } catch {
      // Non-fatal.
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private)
// ---------------------------------------------------------------------------

function sessionToWallet(session: WalletConnectSession): Wallet {
  return {
    id: createUUID(deterministicUUID(session.address)),
    address: session.address,
    chainType: 'evm',
    label: `EVM ${session.address.slice(0, 6)}...${session.address.slice(-4)}`,
    isPrimary: false,
    safeVersion: undefined,
    deploymentStatus: 'running',
    walletProvider: 'walletconnect',
  } satisfies Wallet;
}

/**
 * Produce a deterministic UUID v4-shaped string from an address so that
 * reconnecting the same wallet yields the same domain entity id.
 */
function deterministicUUID(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, '').padEnd(32, '0');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

function stringToHex(str: string): string {
  return (
    '0x' +
    Array.from(new TextEncoder().encode(str))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

function isUserRejection(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('rejected') ||
      msg.includes('declined') ||
      msg.includes('user denied') ||
      msg.includes('user cancelled') ||
      msg.includes('dismissed')
    );
  }
  return false;
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let _instance: WalletConnectAdapter | undefined;

export function getWalletConnectAdapter(): WalletConnectAdapter {
  if (!_instance) {
    _instance = new WalletConnectAdapter();
  }
  return _instance;
}
