import { apiResponse } from '@/lib/api-platform';
/**
 * Non-Custodial Wallet Registration Endpoint
 *
 * Registers public wallet addresses only.
 * Private keys never touch the server.
 *
 * Authentication via signed messages.
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/server/services/supabase/server"
import { WalletVerifier } from "@/lib/client/wallet-generator"


import { logger } from '@/lib/logger';
const RegisterWalletSchema = z.object({
  addresses: z.object({
    evm: z.string().optional(),
    solana: z.string().optional(),
    hyperliquid: z.string().optional(),
  }),
  signature: z.object({
    address: z.string(),
    signature: z.string(),
    message: z.string(),
    chain: z.enum(['evm', 'solana']),
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    if (!supabase) {
      return apiResponse.serviceUnavailable("Authentication service unavailable");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiResponse.unauthorized("Authentication required");
    }

    // Parse and validate request
    const body = await request.json()
    const parsed = RegisterWalletSchema.safeParse(body)

    if (!parsed.success) {
      return apiResponse.validationError(parsed.error);
    }

    const { addresses, signature } = parsed.data

    // Verify the signature
    const isValidSignature = await WalletVerifier.verifySignature(signature)
    if (!isValidSignature) {
      return apiResponse.unauthorized("Signature verification failed");
    }

    // Ensure signature address matches one of the provided addresses
    const signatureAddress = signature.address.toLowerCase()
    const hasMatchingAddress = Object.values(addresses).some(addr =>
      addr?.toLowerCase() === signatureAddress
    )

    if (!hasMatchingAddress) {
      return apiResponse.badRequest("Signature address must match a registered wallet", "address_mismatch");
    }

    // Store wallet addresses (public info only)
    const walletInserts = Object.entries(addresses)
      .filter(([_, address]) => address)
      .map(([chain, address]) => ({
        user_id: user.id,
        wallet_type: `non_custodial_${chain}`,
        address: address!,
        chain_id: getChainId(chain),
        cluster: getCluster(chain),
        created_at: new Date().toISOString(),
      }))

    if (walletInserts.length === 0) {
      return apiResponse.badRequest("At least one wallet address required", "no_addresses");
    }

    // Upsert wallets (ignore conflicts if address already exists)
    const { error: insertError } = await supabase!
      .from('user_wallets')
      .upsert(walletInserts, {
        onConflict: 'user_id,address',
        ignoreDuplicates: true
      })

    if (insertError) {
      logger.error('Wallet registration error:', insertError)
      return apiResponse.internalError("Failed to register wallets", "registration_failed");
    }

    return apiResponse.success({
      message: "Wallets registered successfully",
      registered: walletInserts.length,
      addresses: Object.fromEntries(
        walletInserts.map(w => [w.wallet_type.replace('non_custodial_', ''), w.address])
      )
    })

  } catch (error) {
    logger.error('Wallet registration error:', error)
    return apiResponse.internalError("Registration failed");
  }
}

function getChainId(chain: string): number | null {
  switch (chain) {
    case 'evm': return 1 // Ethereum mainnet
    case 'solana': return null // Solana uses cluster instead
    case 'hyperliquid': return 998 // Hyperliquid chain ID
    default: return null
  }
}

function getCluster(chain: string): string | null {
  switch (chain) {
    case 'solana': return 'mainnet-beta'
    default: return null
  }
}
