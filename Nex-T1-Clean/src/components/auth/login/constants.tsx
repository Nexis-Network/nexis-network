import { DiscordIcon } from "@/components/icons/discord-icon";
import { TwitterIcon } from "@/components/icons/twitter-icon";
import type { TranslationValues } from "@/i18n/translate";
import {
  getAuthMethodLabel,
  getOAuthProviderLabel,
  getWalletProviderLabel,
} from "@/modules/auth/i18n";

import type { AuthMethod, ProviderButton, WalletProvider } from "./types";

type AuthTranslate = (key: string, values?: TranslationValues) => string;

export function getSocialProviders(t: AuthTranslate): ProviderButton[] {
  return [
    {
      id: "google",
      label: getOAuthProviderLabel(t, "google"),
      type: "oauth",
      iconSrc: "/icons/social-icons/google.svg",
    },
    {
      id: "github",
      label: getOAuthProviderLabel(t, "github"),
      type: "oauth",
      iconSrc: "/icons/social-icons/github.svg",
    },
    {
      id: "x",
      label: getOAuthProviderLabel(t, "x"),
      type: "oauth",
      icon: TwitterIcon,
    },
    {
      id: "discord",
      label: getOAuthProviderLabel(t, "discord"),
      type: "oauth",
      icon: DiscordIcon,
    },
    {
      id: "apple",
      label: getOAuthProviderLabel(t, "apple"),
      type: "oauth",
      iconSrc: "/icons/social-icons/apple.svg",
    },
  ];
}

export function getWalletProviders(t: AuthTranslate): WalletProvider[] {
  return [
    {
      id: "wallet-evm",
      label: getWalletProviderLabel(t, "wallet-evm"),
      type: "wallet",
      iconSrc: "/assets/wallet-logos/Metamask.svg",
    },
    {
      id: "walletconnect",
      label: getWalletProviderLabel(t, "walletconnect"),
      type: "wallet",
      iconSrc: "/assets/wallet-logos/WalletConnect.svg",
    },
    {
      id: "wallet-solana",
      label: getWalletProviderLabel(t, "wallet-solana"),
      type: "wallet",
      iconSrc: "/assets/wallet-logos/phantom.svg",
    },
  ];
}

export const AUTH_METHODS: AuthMethod[] = [
  "email",
  "magic-link",
  "email-otp",
  "phone",
  "passkey",
  "wallet-evm",
  "wallet-solana",
  "walletconnect",
];

export function getAuthMethodLabels(t: AuthTranslate): Record<AuthMethod, string> {
  return {
    email: getAuthMethodLabel(t, "email"),
    "magic-link": getAuthMethodLabel(t, "magic-link"),
    "email-otp": getAuthMethodLabel(t, "email-otp"),
    phone: getAuthMethodLabel(t, "phone"),
    passkey: getAuthMethodLabel(t, "passkey"),
    "wallet-evm": getAuthMethodLabel(t, "wallet-evm"),
    "wallet-solana": getAuthMethodLabel(t, "wallet-solana"),
    walletconnect: getAuthMethodLabel(t, "walletconnect"),
  };
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/iu;
export const PHONE_REGEX = /^[+]?\d[\d\s()-]{7,}$/u;
