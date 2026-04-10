import { useState } from "react";
import { useSignMessage } from "wagmi";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to manage SIWE flow via custom Next.js API routes linking
 * a wagmi-compatible wallet (Coinbase CDP) to Supabase Auth.
 */
export function useCoinbaseSiwe() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signMessageAsync } = useSignMessage();
  const supabase = createClient();

  const signInWithWallet = async (walletAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Get Nonce & Statement from Backend
      const nonceRes = await fetch("/api/auth/web3/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (!nonceRes.ok) {
        throw new Error("Failed to generate authentication nonce.");
      }

      const { message } = await nonceRes.json();

      // 2. Prompt Wallet for Signature
      const signature = await signMessageAsync({
        message,
        account: walletAddress as `0x${string}`,
      });

      // 3. Verify Signature and get JWT
      const verifyRes = await fetch("/api/auth/web3/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          signature,
          message,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error("Signature verification failed.");
      }

      const { token } = await verifyRes.json();

      // 4. Hydrate Supabase Session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: token, // We use the same for simplicity unless refresh logic is defined
      });

      if (sessionError) {
        throw new Error("Failed to set Supabase session.");
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("SIWE Flow Error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during sign-in.";
      setError(message);
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    signInWithWallet,
    signOut,
    isLoading,
    error,
  };
}
