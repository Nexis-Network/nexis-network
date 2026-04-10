import type { ComponentType } from "react";
import type { SupabaseOAuthProviderId } from "@/lib/supabase/providers";

export type Mode = "sign-in" | "sign-up";
export type WalletAuthMethod = "wallet-evm" | "wallet-solana" | "walletconnect";
export type AuthMethod =
  | "email"
  | "magic-link"
  | "phone"
  | "passkey"
  | "email-otp"
  | WalletAuthMethod;
export type Step = "entry" | "identifier" | "credentials" | "otp" | "passkey" | "wallet" | "forgot-password";

export type LoginProps = {
  redirectTo?: string;
  onSuccess?: () => void;
  initialMode?: Mode;
  inviteCode?: string | null;
};

export type ProviderButton = {
  id: SupabaseOAuthProviderId;
  label: string;
  type: "oauth";
  icon?: ComponentType<{ className?: string }>;
  iconSrc?: string;
  iconAlt?: string;
};

export type WalletProvider = {
  id: WalletAuthMethod;
  label: string;
  description?: string;
  type: "wallet";
  icon?: ComponentType<{ className?: string }>;
  iconSrc?: string;
  iconAlt?: string;
};
