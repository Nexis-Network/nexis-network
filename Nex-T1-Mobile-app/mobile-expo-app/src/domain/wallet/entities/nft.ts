import type { ChainType } from './wallet';

// ---------------------------------------------------------------------------
// NFT types
// ---------------------------------------------------------------------------

export type NFTStandard = 'ERC-721' | 'ERC-1155' | 'SPL' | 'Metaplex';

export interface NFTAttribute {
  readonly traitType: string;
  readonly value: string;
}

/**
 * An on-chain NFT owned by the user.
 */
export interface NFT {
  readonly tokenId: string;
  readonly contractAddress: string;
  readonly chain: ChainType;
  readonly chainId: number | string;
  readonly name: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly collectionName?: string;
  readonly standard: NFTStandard;
  readonly attributes?: ReadonlyArray<NFTAttribute>;
}
