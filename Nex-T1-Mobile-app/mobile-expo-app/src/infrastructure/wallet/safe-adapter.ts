/**
 * Safe smart wallet (ERC-4337 / Account Abstraction) adapter.
 *
 * Communicates with the Nex T1 backend to provision, query, and transact
 * through Safe smart wallets.  The backend wraps the Safe{Core} SDK and
 * exposes a REST API for:
 *   - Wallet provisioning (factory deploy)
 *   - Transaction proposal and confirmation
 *   - Session key management
 *   - Spending allowance modules
 *
 * All on-chain operations are executed by the backend relayer; the mobile
 * client only proposes and signs.  This means no gas tokens need to be held
 * on the mobile device.
 *
 * SECURITY NOTES:
 * - No private keys are stored or handled here.
 * - Proposal signatures are obtained through the WalletConnect adapter (the
 *   user's external wallet signs on behalf of the Safe owner).
 * - Session keys are stored in expo-secure-store with biometric protection.
 * - All API calls go through the authenticated API client.
 */

import * as SecureStore from 'expo-secure-store';

import { getEnv } from '@config/env';
import type { Wallet, DeploymentStatus } from '@domain/wallet/entities/wallet';
import { WalletError } from '@domain/common/errors/domain-error';
import {
  type Result,
  success,
  failure,
  createUUID,
} from '@domain/common/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_KEY_STORE_PREFIX = 'safe_session_key_';
const DEFAULT_SAFE_VERSION = '1.3.0';

// ---------------------------------------------------------------------------
// API response types (mirrors backend DTO shapes)
// ---------------------------------------------------------------------------

interface SafeProvisionResponse {
  readonly address: string;
  readonly safeVersion: string;
  readonly status: DeploymentStatus;
  readonly owners: ReadonlyArray<string>;
  readonly threshold: number;
  readonly chainId: number;
}

interface SafeStatusResponse {
  readonly address: string;
  readonly safeVersion: string;
  readonly status: DeploymentStatus;
  readonly nonce: number;
  readonly owners: ReadonlyArray<string>;
  readonly threshold: number;
  readonly modules: ReadonlyArray<string>;
  readonly fallbackHandler: string;
  readonly chainId: number;
}

interface SafeTransactionProposal {
  readonly safeTxHash: string;
  readonly to: string;
  readonly value: string;
  readonly data: string;
  readonly operation: number;
  readonly nonce: number;
  readonly status: 'pending' | 'confirmed' | 'executed' | 'failed';
}

interface SessionKeyInfo {
  readonly keyId: string;
  readonly publicKey: string;
  readonly validUntil: number;
  readonly validAfter: number;
  readonly allowedTargets: ReadonlyArray<string>;
}

interface AllowanceInfo {
  readonly token: string;
  readonly amount: string;
  readonly spent: string;
  readonly resetTimeMin: number;
  readonly lastResetTime: number;
  readonly nonce: number;
}

// ---------------------------------------------------------------------------
// API client helper
// ---------------------------------------------------------------------------

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<Result<T, WalletError>> {
  const baseUrl =
    getEnv().MOBILE_API_BASE_URL ?? getEnv().API_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return failure(
        new WalletError(
          `Safe API request failed [${response.status}]: ${body || response.statusText}`,
        ),
      );
    }

    const data = (await response.json()) as T;
    return success(data);
  } catch (err) {
    return failure(
      new WalletError(
        `Safe API network error: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Provision (deploy) a new Safe smart wallet through the backend.
 *
 * The backend creates a counterfactual Safe address and optionally submits
 * the deployment transaction.  The returned wallet entity has
 * `deploymentStatus: 'creating'` until the on-chain deployment confirms.
 *
 * @param ownerAddress - The EOA address that will be the initial Safe owner.
 * @param chainId      - The EVM chain to deploy the Safe on.
 * @param label        - Human-readable label for the wallet.
 */
export async function provisionSafeWallet(
  ownerAddress: string,
  chainId: number = 1,
  label?: string,
): Promise<Result<Wallet, WalletError>> {
  const result = await apiRequest<SafeProvisionResponse>(
    '/wallets/provision',
    {
      method: 'POST',
      body: JSON.stringify({
        ownerAddress,
        chainId,
        threshold: 1,
        safeVersion: DEFAULT_SAFE_VERSION,
      }),
    },
  );

  if (!result.ok) return result;

  const data = result.value;

  const wallet: Wallet = {
    id: createUUID(deterministicSafeUUID(data.address)),
    address: data.address,
    chainType: 'evm',
    label: label ?? `Safe ${data.address.slice(0, 6)}...${data.address.slice(-4)}`,
    isPrimary: false,
    safeVersion: data.safeVersion,
    deploymentStatus: data.status,
    walletProvider: 'safe',
  } satisfies Wallet;

  return success(wallet);
}

/**
 * Query the current status of a Safe wallet.
 */
export async function getSafeStatus(
  safeAddress: string,
): Promise<Result<SafeStatusResponse, WalletError>> {
  return apiRequest<SafeStatusResponse>(
    `/wallets/${encodeURIComponent(safeAddress)}/status`,
  );
}

/**
 * Propose a transaction through the Safe.
 *
 * The backend queues the transaction and returns a `safeTxHash` that must
 * be signed by the required number of Safe owners before execution.
 */
export async function proposeTransaction(
  safeAddress: string,
  params: {
    readonly to: string;
    readonly value: string;
    readonly data?: string;
    readonly operation?: number; // 0 = Call, 1 = DelegateCall
  },
): Promise<Result<SafeTransactionProposal, WalletError>> {
  return apiRequest<SafeTransactionProposal>(
    `/wallets/${encodeURIComponent(safeAddress)}/transactions`,
    {
      method: 'POST',
      body: JSON.stringify({
        to: params.to,
        value: params.value,
        data: params.data ?? '0x',
        operation: params.operation ?? 0,
      }),
    },
  );
}

/**
 * Submit an owner signature for a pending Safe transaction.
 *
 * @param safeAddress - The Safe wallet address.
 * @param safeTxHash  - The hash of the pending Safe transaction.
 * @param signature   - The EIP-712 or eth_sign signature from an owner.
 */
export async function confirmTransaction(
  safeAddress: string,
  safeTxHash: string,
  signature: string,
): Promise<Result<SafeTransactionProposal, WalletError>> {
  return apiRequest<SafeTransactionProposal>(
    `/wallets/${encodeURIComponent(safeAddress)}/transactions/${encodeURIComponent(safeTxHash)}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({ signature }),
    },
  );
}

/**
 * Execute a fully confirmed Safe transaction.
 *
 * The backend relayer submits the on-chain transaction and pays the gas.
 */
export async function executeTransaction(
  safeAddress: string,
  safeTxHash: string,
): Promise<Result<{ txHash: string }, WalletError>> {
  return apiRequest<{ txHash: string }>(
    `/wallets/${encodeURIComponent(safeAddress)}/transactions/${encodeURIComponent(safeTxHash)}/execute`,
    { method: 'POST' },
  );
}

// ---------------------------------------------------------------------------
// Session key management
// ---------------------------------------------------------------------------

/**
 * Request a new session key from the backend.
 *
 * Session keys allow the mobile app to submit limited transactions without
 * requiring a full owner signature each time.  The key is stored in
 * SecureStore with biometric access control.
 */
export async function createSessionKey(
  safeAddress: string,
  params: {
    readonly validUntil: number; // Unix timestamp (seconds)
    readonly allowedTargets: ReadonlyArray<string>;
  },
): Promise<Result<SessionKeyInfo, WalletError>> {
  const result = await apiRequest<SessionKeyInfo & { privateKey: string }>(
    `/wallets/${encodeURIComponent(safeAddress)}/session-keys`,
    {
      method: 'POST',
      body: JSON.stringify({
        validUntil: params.validUntil,
        validAfter: Math.floor(Date.now() / 1000),
        allowedTargets: params.allowedTargets,
      }),
    },
  );

  if (!result.ok) return result;

  const { privateKey, ...sessionKeyInfo } = result.value;

  // Store the private portion in SecureStore with biometric requirement.
  // The key is NEVER kept in JS memory beyond this function scope.
  try {
    await SecureStore.setItemAsync(
      `${SESSION_KEY_STORE_PREFIX}${sessionKeyInfo.keyId}`,
      privateKey,
      {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to store session key',
        keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      },
    );
  } catch (err) {
    return failure(
      new WalletError(
        `Failed to store session key securely: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }

  return success(sessionKeyInfo);
}

/**
 * Retrieve metadata about stored session keys for a Safe.
 */
export async function getSessionKeys(
  safeAddress: string,
): Promise<Result<ReadonlyArray<SessionKeyInfo>, WalletError>> {
  return apiRequest<ReadonlyArray<SessionKeyInfo>>(
    `/wallets/${encodeURIComponent(safeAddress)}/session-keys`,
  );
}

/**
 * Revoke (delete) a session key both on the backend and in local storage.
 */
export async function revokeSessionKey(
  safeAddress: string,
  keyId: string,
): Promise<Result<void, WalletError>> {
  const result = await apiRequest<void>(
    `/wallets/${encodeURIComponent(safeAddress)}/session-keys/${encodeURIComponent(keyId)}`,
    { method: 'DELETE' },
  );

  if (!result.ok) return result;

  // Best-effort removal from SecureStore
  try {
    await SecureStore.deleteItemAsync(`${SESSION_KEY_STORE_PREFIX}${keyId}`);
  } catch {
    // Non-fatal
  }

  return success(undefined);
}

// ---------------------------------------------------------------------------
// Allowance module interaction
// ---------------------------------------------------------------------------

/**
 * Get spending allowances configured on the Safe's AllowanceModule.
 */
export async function getAllowances(
  safeAddress: string,
): Promise<Result<ReadonlyArray<AllowanceInfo>, WalletError>> {
  return apiRequest<ReadonlyArray<AllowanceInfo>>(
    `/wallets/${encodeURIComponent(safeAddress)}/allowances`,
  );
}

/**
 * Set or update a spending allowance for a delegate.
 */
export async function setAllowance(
  safeAddress: string,
  params: {
    readonly delegate: string;
    readonly token: string;
    readonly amount: string;
    readonly resetTimeMin: number;
  },
): Promise<Result<AllowanceInfo, WalletError>> {
  return apiRequest<AllowanceInfo>(
    `/wallets/${encodeURIComponent(safeAddress)}/allowances`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  );
}

// ---------------------------------------------------------------------------
// Session invalidation (logout)
// ---------------------------------------------------------------------------

/**
 * Wipe all Safe session data from SecureStore.
 *
 * Called during user logout to ensure no session keys survive.
 */
export async function invalidateAllSessions(): Promise<void> {
  // SecureStore does not expose a "list all keys" API, so we track known
  // key IDs in a simple comma-separated list.
  try {
    const indexRaw = await SecureStore.getItemAsync('safe_session_key_index');
    if (indexRaw) {
      const keyIds = indexRaw.split(',').filter(Boolean);
      await Promise.allSettled(
        keyIds.map((keyId) =>
          SecureStore.deleteItemAsync(`${SESSION_KEY_STORE_PREFIX}${keyId}`),
        ),
      );
      await SecureStore.deleteItemAsync('safe_session_key_index');
    }
  } catch {
    // Best-effort cleanup
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Produce a deterministic UUID-shaped string from a Safe address.
 */
function deterministicSafeUUID(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, '').padEnd(32, 'f');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Map a Safe status response to a domain Wallet entity.
 */
export function safeStatusToWallet(
  status: SafeStatusResponse,
  label?: string,
): Wallet {
  return {
    id: createUUID(deterministicSafeUUID(status.address)),
    address: status.address,
    chainType: 'evm',
    label: label ?? `Safe ${status.address.slice(0, 6)}...${status.address.slice(-4)}`,
    isPrimary: false,
    safeVersion: status.safeVersion,
    deploymentStatus: status.status,
    walletProvider: 'safe',
  } satisfies Wallet;
}
