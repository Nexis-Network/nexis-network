import { getAddress } from 'viem';


import { logger } from '@/lib/logger';
const REPO_BASE_URL = 'https://raw.githubusercontent.com/nexisdev/assets/master';

export interface TokenInfo {
    name: string;
    symbol: string;
    decimals: number;
    description?: string;
    website?: string;
    explorer?: string;
    status?: string;
    type?: string;
    tags?: string[];
    links?: {
        name: string;
        url: string;
    }[];
}

/**
 * Normalizes the chain name to match the repository folder structure.
 * e.g. 'ethereum' -> 'ethereum', 'binance-smart-chain' -> 'binance-smart-chain'
 * This might need a mapping if your app uses different internal IDs.
 */
export function normalizeChainName(chain: string): string {
    // Simple normalization for now, can be expanded based on app's chain IDs
    return chain.toLowerCase().replace(/\s+/g, '-');
}

export function getBlockchainLogoUrl(chain: string): string {
    const normalizedChain = normalizeChainName(chain);
    return `${REPO_BASE_URL}/blockchains/${normalizedChain}/info/logo.png`;
}

export function getTokenLogoUrl(chain: string, address: string): string {
    const normalizedChain = normalizeChainName(chain);
    // The repo seems to use checksummed addresses for folders, but let's try to be safe.
    // If the repo enforces checksums, we should checksum the address.
    // If it uses lowercase, we should lowercase.
    // Based on exploration: '0x0000000000085d4780B73119b644AE5ecd22b376' -> Checksummed.
    let formattedAddress = address;
    try {
        formattedAddress = getAddress(address);
    } catch (e) {
        logger.warn(`Invalid address format for ${address}, using as-is.`, e);
    }

    return `${REPO_BASE_URL}/blockchains/${normalizedChain}/assets/${formattedAddress}/logo.png`;
}

export async function getTokenInfo(chain: string, address: string): Promise<TokenInfo | null> {
    const normalizedChain = normalizeChainName(chain);
    let formattedAddress = address;
    try {
        formattedAddress = getAddress(address);
    } catch (e) {
        logger.warn(`Invalid address format for ${address}, using as-is.`, e);
    }

    const url = `${REPO_BASE_URL}/blockchains/${normalizedChain}/assets/${formattedAddress}/info.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Failed to fetch token info: ${response.statusText}`);
        }
        const data = await response.json();
        return data as TokenInfo;
    } catch (error) {
        logger.error('Error fetching token info from repo:', error);
        return null;
    }
}

export function getDappLogoUrl(dappUrl: string): string {
    // dappUrl should be the domain, e.g. 'aave.com'
    // If the user passes 'https://app.aave.com', we should probably extract the domain.
    let domain = dappUrl;
    try {
        const urlObj = new URL(dappUrl.startsWith('http') ? dappUrl : `https://${dappUrl}`);
        domain = urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
        // fallback to using the string as is if it's not a valid URL
        logger.warn("Invalid dapp URL provided, using raw string", e);
    }

    return `${REPO_BASE_URL}/dapps/${domain}.png`;
}
