import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
export type WalletAsset = {
  id: string;
  wallet_id: string;
  chain_id: number;
  token_address: string | null;
  symbol: string;
  name: string;
  decimals: number;
  balance_raw: string;
  balance_usd: number | null;
  last_updated_at: string;
};

export function useWalletAccounts(userId: string | undefined) {
  const supabase = createClient();

  const queryKey = ["user-wallets", userId];

  const { data: wallets, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("wallet_accounts")
        .select(`*`);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  return {
    wallets,
    isLoading,
    error
  };
}
