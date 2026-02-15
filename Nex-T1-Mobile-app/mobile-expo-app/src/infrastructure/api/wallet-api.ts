/**
 * wallet-api.ts
 *
 * Infrastructure adapter that implements the server-side subset of
 * `IWalletRepository` by calling the mobile API gateway's `/wallets/*`
 * endpoints.
 *
 * On-chain signing and local key management are handled by the wallet
 * infrastructure module (`@infrastructure/wallet`), not here.
 */

import type { IWalletRepository } from '@domain/wallet/repositories/wallet-repository';
import type { SendTransactionParams } from '@domain/wallet/repositories/wallet-repository';
import type {
  Wallet,
  TokenBalance,
  Transaction,
  TransactionStatus,
} from '@domain/wallet/entities/wallet';
import type { DomainError } from '@domain/common/errors/domain-error';
import type { Result, Pagination, PaginatedResult } from '@domain/common/types';
import { success, createUUID, createTimestamp } from '@domain/common/types';
import { getMobileApiClient } from './mobile-api-client';

// ---------------------------------------------------------------------------
// API response shapes (private)
// ---------------------------------------------------------------------------

interface ApiWallet {
  id: string;
  address: string;
  chain_type: string;
  label: string;
  is_primary: boolean;
  safe_version?: string | null;
  deployment_status: string;
}

interface ApiTokenBalance {
  token_address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  usd_value?: number | null;
  icon_url?: string | null;
}

interface ApiTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas_used?: string | null;
  status: string;
  timestamp: string;
  chain_id: number;
}

interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toWallet(raw: ApiWallet): Wallet {
  return {
    id: createUUID(raw.id),
    address: raw.address,
    chainType: raw.chain_type as Wallet['chainType'],
    label: raw.label,
    isPrimary: raw.is_primary,
    safeVersion: raw.safe_version ?? undefined,
    deploymentStatus: raw.deployment_status as Wallet['deploymentStatus'],
    walletProvider: 'walletconnect' as const,
  };
}

function toTokenBalance(raw: ApiTokenBalance): TokenBalance {
  return {
    tokenAddress: raw.token_address,
    symbol: raw.symbol,
    name: raw.name,
    balance: raw.balance,
    decimals: raw.decimals,
    usdValue: raw.usd_value ?? undefined,
    iconUrl: raw.icon_url ?? undefined,
  };
}

function toTransaction(raw: ApiTransaction): Transaction {
  return {
    hash: raw.hash,
    from: raw.from,
    to: raw.to,
    value: raw.value,
    gasUsed: raw.gas_used ?? undefined,
    status: raw.status as TransactionStatus,
    timestamp: createTimestamp(new Date(raw.timestamp).getTime()),
    chainId: raw.chain_id,
  };
}

function toPaginated<TApi, TDomain>(
  raw: ApiPaginatedResponse<TApi>,
  mapper: (item: TApi) => TDomain,
): PaginatedResult<TDomain> {
  return {
    data: raw.data.map(mapper),
    total: raw.total,
    page: raw.page,
    pageSize: raw.page_size,
    totalPages: raw.total_pages,
    hasNextPage: raw.has_next_page,
    hasPreviousPage: raw.has_previous_page,
  };
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class WalletApi implements IWalletRepository {
  private readonly api = getMobileApiClient();

  async getWallets(): Promise<Result<ReadonlyArray<Wallet>, DomainError>> {
    const result = await this.api.get<ApiWallet[]>('/wallets');
    if (!result.ok) return result;
    return success(result.value.map(toWallet));
  }

  async getWalletByAddress(
    address: string,
  ): Promise<Result<Wallet | null, DomainError>> {
    const result = await this.api.get<ApiWallet | null>(
      `/wallets/${encodeURIComponent(address)}`,
    );
    if (!result.ok) return result;
    if (!result.value) return success(null);
    return success(toWallet(result.value));
  }

  async getBalances(
    walletId: string,
  ): Promise<Result<ReadonlyArray<TokenBalance>, DomainError>> {
    const result = await this.api.get<ApiTokenBalance[]>(
      `/wallets/${encodeURIComponent(walletId)}/balances`,
    );
    if (!result.ok) return result;
    return success(result.value.map(toTokenBalance));
  }

  async getTransactions(
    walletId: string,
    pagination: Pagination,
  ): Promise<Result<PaginatedResult<Transaction>, DomainError>> {
    const result = await this.api.get<ApiPaginatedResponse<ApiTransaction>>(
      `/wallets/${encodeURIComponent(walletId)}/transactions`,
      {
        params: {
          page: pagination.page,
          page_size: pagination.pageSize,
          sort_by: pagination.sortBy,
          sort_order: pagination.sortOrder,
        },
      },
    );

    if (!result.ok) return result;
    return success(toPaginated(result.value, toTransaction));
  }

  async sendTransaction(
    params: SendTransactionParams,
  ): Promise<Result<Transaction, DomainError>> {
    const result = await this.api.post<ApiTransaction>('/wallets/send', {
      from: params.from,
      to: params.to,
      value: params.value,
      chain_id: params.chainId,
      data: params.data,
    });

    if (!result.ok) return result;
    return success(toTransaction(result.value));
  }

  async connectWallet(
    address: string,
    chainType: string,
  ): Promise<Result<Wallet, DomainError>> {
    const result = await this.api.post<ApiWallet>('/wallets/provision', {
      address,
      chain_type: chainType,
    });

    if (!result.ok) return result;
    return success(toWallet(result.value));
  }

  async disconnectWallet(walletId: string): Promise<Result<void, DomainError>> {
    return this.api.delete<void>(`/wallets/${encodeURIComponent(walletId)}`);
  }
}
