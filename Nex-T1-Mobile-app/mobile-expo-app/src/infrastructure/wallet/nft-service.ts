/**
 * NFT Fetching Service
 *
 * Infrastructure layer service for fetching NFT metadata and ownership
 * data from external APIs. Supports multiple chains with chain-specific
 * adapters.
 *
 * Currently supports:
 * - EVM chains via Moralis API
 * - Solana (stub for MVP, production should use Helius or Metaplex DAS)
 */

import { getEnv } from '@config/env';
import { WalletError } from '@domain/common/errors/domain-error';
import { type Result, success, failure } from '@domain/common/types';
import type { NFT, NFTAttribute, NFTStandard } from '@domain/wallet/entities/nft';
import type { ChainType } from '@domain/wallet/entities/wallet';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_LIMIT = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Raw NFT response from Moralis API.
 */
interface MoralisNFTResult {
  readonly token_id: string;
  readonly token_address: string;
  readonly contract_type: string;
  readonly name: string;
  readonly symbol: string;
  readonly token_uri: string | null;
  readonly metadata: string | null;
  readonly amount: string;
  readonly owner_of: string;
  readonly block_number: string;
  readonly block_number_minted: string | null;
  readonly possible_spam: boolean;
  readonly verified_collection: boolean;
}

/**
 * Moralis API response envelope.
 */
interface MoralisNFTResponse {
  readonly status: string;
  readonly page: number;
  readonly page_size: number;
  readonly cursor: string | null;
  readonly result: ReadonlyArray<MoralisNFTResult>;
}

/**
 * Parsed metadata from the NFT metadata JSON string.
 */
interface ParsedMetadata {
  readonly name?: string;
  readonly description?: string;
  readonly image?: string;
  readonly attributes?: ReadonlyArray<{
    readonly trait_type?: string;
    readonly value?: string | number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps Moralis contract_type to our NFTStandard enum.
 */
function mapTokenStandard(contractType: string): NFTStandard {
  const normalized = contractType.toUpperCase().replace(/-/g, '');

  switch (normalized) {
    case 'ERC721':
      return 'ERC-721';
    case 'ERC1155':
      return 'ERC-1155';
    default:
      // Default to ERC-721 for unknown types on EVM
      return 'ERC-721';
  }
}

/**
 * Safely parses the metadata JSON string from Moralis.
 * Returns undefined for null, empty, or invalid JSON.
 */
function parseMetadata(metadataString: string | null): ParsedMetadata | undefined {
  if (!metadataString || metadataString.trim() === '') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(metadataString) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      return undefined;
    }

    return parsed as ParsedMetadata;
  } catch {
    // Invalid JSON is common for some NFTs; fail gracefully
    return undefined;
  }
}

/**
 * Extracts and normalizes image URL from metadata.
 * Handles IPFS URLs by converting to gateway URLs.
 */
function normalizeImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  // Convert IPFS URLs to HTTP gateway URLs
  if (imageUrl.startsWith('ipfs://')) {
    return imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  return imageUrl;
}

/**
 * Maps parsed metadata attributes to our NFTAttribute interface.
 */
function mapAttributes(
  rawAttributes: ParsedMetadata['attributes'],
): ReadonlyArray<NFTAttribute> | undefined {
  if (!rawAttributes || !Array.isArray(rawAttributes)) {
    return undefined;
  }

  const mapped: NFTAttribute[] = [];

  for (const attr of rawAttributes) {
    if (attr.trait_type !== undefined && attr.value !== undefined) {
      mapped.push({
        traitType: String(attr.trait_type),
        value: String(attr.value),
      });
    }
  }

  return mapped.length > 0 ? mapped : undefined;
}

/**
 * Maps a single Moralis NFT result to our domain NFT entity.
 */
function mapMoralisNFTToEntity(
  item: MoralisNFTResult,
  chainId: number,
): NFT {
  const metadata = parseMetadata(item.metadata);

  // Prefer metadata name over token name
  const name =
    metadata?.name ?? item.name ?? `Token #${item.token_id}`;

  // Build base NFT object with required fields
  const nft: NFT = {
    tokenId: item.token_id,
    contractAddress: item.token_address,
    chain: 'evm' as ChainType,
    chainId,
    name,
    standard: mapTokenStandard(item.contract_type),
  };

  // Conditionally add optional fields (exactOptionalPropertyTypes compatibility)
  const description = metadata?.description;
  const imageUrl = normalizeImageUrl(metadata?.image);
  const collectionName = item.name || null;
  const attributes = mapAttributes(metadata?.attributes);

  if (description) {
    (nft as { description: string }).description = description;
  }
  if (imageUrl) {
    (nft as { imageUrl: string }).imageUrl = imageUrl;
  }
  if (collectionName) {
    (nft as { collectionName: string }).collectionName = collectionName;
  }
  if (attributes) {
    (nft as { attributes: ReadonlyArray<NFTAttribute> }).attributes = attributes;
  }

  return nft;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches NFTs owned by an EVM address using the Moralis API.
 *
 * @param address - The wallet address to fetch NFTs for (0x prefixed)
 * @param chainId - Numeric EVM chain ID (e.g., 1 for Ethereum, 137 for Polygon)
 * @returns A Result containing an array of NFT entities or a WalletError
 */
export async function fetchEvmNFTs(
  address: string,
  chainId: number,
): Promise<Result<ReadonlyArray<NFT>, WalletError>> {
  const apiKey = getEnv().MORALIS_API_KEY;

  if (!apiKey) {
    return failure(
      new WalletError('Moralis API key is not configured', address),
    );
  }

  // Build URL with query parameters
  const hexChainId = `0x${chainId.toString(16)}`;
  const url = new URL(`${MORALIS_BASE_URL}/${address}/nft`);
  url.searchParams.set('chain', hexChainId);
  url.searchParams.set('format', 'decimal');
  url.searchParams.set('limit', String(DEFAULT_LIMIT));

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return failure(
        new WalletError(
          `Moralis API error (${response.status}): ${errorText}`,
          address,
        ),
      );
    }

    const data = (await response.json()) as MoralisNFTResponse;

    // Map results to domain entities
    const nfts: NFT[] = data.result.map((item) =>
      mapMoralisNFTToEntity(item, chainId),
    );

    return success(nfts);
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return failure(
        new WalletError('NFT fetch request timed out', address),
      );
    }

    // Handle network errors
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error fetching NFTs';

    return failure(new WalletError(`NFT fetch failed: ${message}`, address));
  }
}

/**
 * Fetches NFTs owned by a Solana address.
 *
 * TODO: Integrate Helius or Metaplex DAS API for production.
 * Currently returns an empty array as a stub for MVP.
 *
 * @param address - The Solana wallet address (base58 encoded)
 * @returns A Result containing an array of NFT entities or a WalletError
 */
export async function fetchSolanaNFTs(
  address: string,
): Promise<Result<ReadonlyArray<NFT>, WalletError>> {
  // TODO: Integrate Helius or Metaplex DAS API for production
  // For now, return empty array as stub
  void address; // Suppress unused variable warning
  return success([]);
}
