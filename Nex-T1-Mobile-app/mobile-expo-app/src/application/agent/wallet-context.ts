/**
 * AI Wallet Context Builder
 *
 * Pure function that constructs a plain-text summary of the user's
 * wallet state for injection into AI agent prompts. The context enables
 * the agent to answer portfolio questions, suggest swaps, and understand
 * the user's on-chain position without additional API calls.
 */

import type { Wallet, TokenBalance } from '@domain/wallet/entities/wallet';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a human-readable context string describing the user's wallet state.
 *
 * @param activeWallet - The currently selected wallet, or null.
 * @param portfolio    - Token balances for the active wallet.
 * @param totalValue   - Aggregated portfolio value in USD.
 * @returns A multi-line plain-text description suitable for LLM prompts.
 */
export function buildWalletContext(
  activeWallet: Wallet | null,
  portfolio: ReadonlyArray<TokenBalance>,
  totalValue: number,
): string {
  if (!activeWallet) {
    return 'The user has no active wallet connected.';
  }

  const tokenSummary = portfolio
    .filter((t) => parseFloat(t.balance) > 0)
    .map(
      (t) =>
        `${t.symbol}: ${t.balance}${t.usdValue != null ? ` ($${t.usdValue.toFixed(2)})` : ''}`,
    )
    .join(', ');

  return [
    `Active wallet: ${activeWallet.address}`,
    `Chain: ${activeWallet.chainType}${activeWallet.chainId ? ` (chain ID: ${activeWallet.chainId})` : ''}`,
    `Wallet type: ${activeWallet.walletProvider} smart wallet`,
    `Total portfolio value: $${totalValue.toFixed(2)}`,
    tokenSummary ? `Token balances: ${tokenSummary}` : 'No token balances available.',
    activeWallet.chainType === 'solana' ? 'Jupiter swaps available on Solana.' : '',
  ]
    .filter(Boolean)
    .join('\n');
}
