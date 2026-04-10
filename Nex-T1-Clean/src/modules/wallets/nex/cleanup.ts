import { deleteNexSigner } from "./signer";
import { deleteSolanaWallet } from "./solana-wallet";

const SMART_ACCOUNT_CACHE_KEY = "nex_sa_cache";

/**
 * Purge all Nex wallet artifacts for a user from local storage.
 * Safe to call on logout or account switch.
 */
export async function purgeNexWalletStorage(userId: string) {
  if (!userId) return;

  await deleteNexSigner(userId);
  deleteSolanaWallet(userId, "mainnet");
  deleteSolanaWallet(userId, "devnet");

  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(SMART_ACCOUNT_CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
        if (parsed[userId]) {
          delete parsed[userId];
          window.localStorage.setItem(SMART_ACCOUNT_CACHE_KEY, JSON.stringify(parsed));
        }
      } catch {
        // ignore corrupted cache
      }
    }
  }
}
