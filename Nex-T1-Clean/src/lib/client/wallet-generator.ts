/**
 * Client-Side Non-Custodial Wallet Generator
 *
 * True self-custody implementation:
 * - Keys generated client-side only
 * - Private keys never leave the client
 * - Server only sees public addresses
 * - Authentication via message signing
 */

import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { verifyMessage } from 'viem'
import { Keypair } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

export interface WalletAddress {
  evm?: string
  solana?: string
  hyperliquid?: string
}

export interface SignedMessage {
  address: string
  signature: string
  message: string
  chain: 'evm' | 'solana'
}

/**
 * Generate wallets client-side only
 * Private keys are stored in memory/encrypted client-side storage
 */
export class NonCustodialWalletGenerator {
  private evmWallet: { address: string; privateKey: `0x${string}`; signMessage: (message: string) => Promise<`0x${string}`> } | null = null
  private solanaKeypair: Keypair | null = null

  /**
   * Generate new EVM wallet (Ethereum-compatible)
   */
  async generateEVMWallet(): Promise<{ address: string; privateKey: string }> {
    const privateKey = generatePrivateKey()
    const account = privateKeyToAccount(privateKey)
    // Store account for signing
    this.evmWallet = {
      address: account.address,
      privateKey,
      signMessage: (message: string) => account.signMessage({ message })
    }
    return {
      address: account.address,
      privateKey
    }
  }

  /**
   * Generate new Solana wallet
   */
  async generateSolanaWallet(): Promise<{ address: string; privateKey: string }> {
    this.solanaKeypair = Keypair.generate()
    return {
      address: this.solanaKeypair.publicKey.toBase58(),
      privateKey: bs58.encode(this.solanaKeypair.secretKey)
    }
  }

  /**
   * Sign authentication message for server verification
   */
  async signAuthMessage(message: string, chain: 'evm' | 'solana'): Promise<SignedMessage> {
    if (chain === 'evm' && this.evmWallet) {
      const signature = await this.evmWallet.signMessage(message)
      return {
        address: this.evmWallet.address,
        signature,
        message,
        chain: 'evm'
      }
    }

    if (chain === 'solana' && this.solanaKeypair) {
      const messageBytes = new TextEncoder().encode(message)
      const signature = nacl.sign.detached(messageBytes, this.solanaKeypair.secretKey)
      return {
        address: this.solanaKeypair.publicKey.toBase58(),
        signature: bs58.encode(signature),
        message,
        chain: 'solana'
      }
    }

    throw new Error(`No ${chain} wallet available for signing`)
  }

  /**
   * Get public addresses only (safe to share with server)
   */
  getPublicAddresses(): WalletAddress {
    return {
      evm: this.evmWallet?.address,
      solana: this.solanaKeypair?.publicKey.toBase58(),
      // Hyperliquid would use similar approach
    }
  }

  /**
   * Encrypt and store private keys client-side
   * Never send to server
   */
  async storeEncryptedPrivateKeys(_password: string): Promise<void> {
    // Implementation would encrypt private keys with user password
    // and store in localStorage/indexedDB
    // This ensures keys are only accessible with user password
  }

  /**
   * Load encrypted private keys from client storage
   */
  async loadEncryptedPrivateKeys(_password: string): Promise<void> {
    // Implementation would decrypt keys from client storage
    // and restore wallet instances
  }
}

/**
 * Server-side wallet verification (no private keys)
 */
export class WalletVerifier {
  /**
   * Verify signed message against known public address
   */
  static async verifySignature(signedMessage: SignedMessage): Promise<boolean> {
    const { address, signature, message, chain } = signedMessage

    if (chain === 'evm') {
      try {
        return await verifyMessage({
          address: address as `0x${string}`,
          message,
          signature: signature as `0x${string}`
        })
      } catch {
        return false
      }
    }

    if (chain === 'solana') {
      try {
        const messageBytes = new TextEncoder().encode(message)
        const signatureBytes = bs58.decode(signature)
        const publicKeyBytes = bs58.decode(address)
        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
      } catch {
        return false
      }
    }

    return false
  }
}

// bs58Decode is imported above
