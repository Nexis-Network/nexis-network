"use client";

import { useMemo } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";

import { logger } from '@/lib/logger';
export interface CustomToken {
  id: string;
  user_id: string;
  chain_id: string;
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddCustomTokenInput {
  chainId: string;
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  logoFile?: File;
}

export function useCustomTokens(chainId?: string) {
  const supabase = createClient();
  const { user } = useAuthContext();
  const userId = user?.id;

  const cacheKey = useMemo(() => {
    if (!userId) return null;
    return chainId && chainId !== "all"
      ? ["custom-tokens", userId, chainId]
      : ["custom-tokens", userId];
  }, [userId, chainId]);

  const { data, isLoading, error } = useSWR(
    cacheKey,
    async () => {
      if (!userId) return [];

      let query = supabase
        .from("custom_tokens")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (chainId && chainId !== "all") {
        query = query.eq("chain_id", chainId);
      }

      const { data: tokens, error: fetchError } = await query;

      if (fetchError) {
        // If the table doesn't exist (yet) or is not found, return empty list gracefully
        if (fetchError.code === '42P01' || fetchError.message.includes('404')) {
            logger.warn("[CustomTokens] Table missing or not accessible. Returning empty lists.");
            return [];
        }
        throw fetchError;
      }
      return tokens as CustomToken[];
    },
    { refreshInterval: 60000 }
  );

  const addCustomToken = async (input: AddCustomTokenInput): Promise<CustomToken> => {
    if (!userId) throw new Error("User not authenticated");

    let logoUrl: string | null = null;

    // Upload logo if provided
    if (input.logoFile) {
      const fileExt = input.logoFile.name.split(".").pop();
      const fileName = `${userId}/${input.chainId}/${input.contractAddress}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("custom-token-logos")
        .upload(fileName, input.logoFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        logger.error("Logo upload failed:", uploadError);
        // Continue without logo
      } else {
        const { data: urlData } = supabase.storage
          .from("custom-token-logos")
          .getPublicUrl(uploadData.path);
        logoUrl = urlData.publicUrl;
      }
    }

    // Insert custom token
    const { data: token, error: insertError } = await supabase
      .from("custom_tokens")
      .insert({
        user_id: userId,
        chain_id: input.chainId,
        contract_address: input.contractAddress.toLowerCase(),
        name: input.name,
        symbol: input.symbol.toUpperCase(),
        decimals: input.decimals,
        logo_url: logoUrl,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Refresh cache
    mutate(cacheKey);

    return token as CustomToken;
  };

  const removeCustomToken = async (tokenId: string): Promise<void> => {
    if (!userId) throw new Error("User not authenticated");

    const { error: deleteError } = await supabase
      .from("custom_tokens")
      .delete()
      .eq("id", tokenId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    // Refresh cache
    mutate(cacheKey);
  };

  const updateCustomToken = async (
    tokenId: string,
    updates: Partial<Pick<CustomToken, "name" | "symbol" | "decimals">> & {
      logoFile?: File;
    }
  ): Promise<CustomToken> => {
    if (!userId) throw new Error("User not authenticated");

    const updateData: Record<string, UntypedJson> = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.symbol) updateData.symbol = updates.symbol.toUpperCase();
    if (updates.decimals !== undefined) updateData.decimals = updates.decimals;

    // Handle logo update
    if (updates.logoFile) {
      // Get existing token to know chain and address
      const { data: existing } = await supabase
        .from("custom_tokens")
        .select("chain_id, contract_address")
        .eq("id", tokenId)
        .single();

      if (existing) {
        const fileExt = updates.logoFile.name.split(".").pop();
        const fileName = `${userId}/${existing.chain_id}/${existing.contract_address}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("custom-token-logos")
          .upload(fileName, updates.logoFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("custom-token-logos")
            .getPublicUrl(uploadData.path);
          updateData.logo_url = urlData.publicUrl;
        }
      }
    }

    const { data: token, error: updateError } = await supabase
      .from("custom_tokens")
      .update(updateData)
      .eq("id", tokenId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Refresh cache
    mutate(cacheKey);

    return token as CustomToken;
  };

  return {
    customTokens: data || [],
    isLoading,
    error,
    addCustomToken,
    removeCustomToken,
    updateCustomToken,
  };
}
