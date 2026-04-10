import type { TranslationValues } from "@/i18n/translate";
import type { SupabaseOAuthProviderId } from "@/lib/supabase/providers";
import type { AuthMethod, WalletAuthMethod } from "@/components/auth/login/types";

type AuthTranslate = (key: string, values?: TranslationValues) => string;

const ONBOARDING_ROLE_IDS = [
  "crypto_trader",
  "nft_trader",
  "memecoin_degen",
  "researcher",
  "developer",
  "manager",
  "kol",
  "other",
] as const;

const ONBOARDING_USAGE_IDS = [
  "personal",
  "team",
  "enterprise",
  "education",
] as const;

export function getSignInDialogCopy(t: AuthTranslate) {
  return {
    title: t("dialog.title"),
    description: t("dialog.description"),
  };
}

export function getOnboardingCarouselCopy(t: AuthTranslate) {
  return {
    logoAlt: t("layout.logoAlt"),
    visualAlt: t("layout.visualAlt"),
    slides: [
      {
        title: t("onboarding.slides.companion.title"),
        description: t("onboarding.slides.companion.description"),
      },
      {
        title: t("onboarding.slides.multichain.title"),
        description: t("onboarding.slides.multichain.description"),
      },
      {
        title: t("onboarding.slides.trading.title"),
        description: t("onboarding.slides.trading.description"),
      },
    ],
    goToSlide: (index: number) => t("onboarding.goToSlide", { index }),
  };
}

export function getVerifyEmailBannerCopy(t: AuthTranslate) {
  return {
    title: t("verifyEmail.title"),
    body: t("verifyEmail.body"),
    resend: t("verifyEmail.resend"),
    sending: t("verifyEmail.sending"),
    success: t("verifyEmail.success"),
    failure: t("verifyEmail.failure"),
  };
}

const OAUTH_PROVIDER_KEYS: Partial<Record<SupabaseOAuthProviderId, string>> = {
  google: "providers.google",
  github: "providers.github",
  x: "providers.twitter",
  discord: "providers.discord",
  apple: "providers.apple",
};

const WALLET_PROVIDER_KEYS: Record<WalletAuthMethod, string> = {
  "wallet-evm": "providers.evmWallet",
  walletconnect: "providers.walletConnect",
  "wallet-solana": "providers.solanaWallet",
};

const AUTH_METHOD_KEYS: Record<AuthMethod, string> = {
  email: "methods.email",
  "magic-link": "methods.magicLink",
  "email-otp": "methods.emailCode",
  phone: "methods.phone",
  passkey: "methods.passkey",
  "wallet-evm": "methods.evmWallet",
  "wallet-solana": "methods.solanaWallet",
  walletconnect: "methods.walletConnect",
};

export function getOAuthProviderLabel(
  t: AuthTranslate,
  provider: SupabaseOAuthProviderId,
) {
  const key = OAUTH_PROVIDER_KEYS[provider];
  return key ? t(key) : provider;
}

export function getWalletProviderLabel(
  t: AuthTranslate,
  provider: WalletAuthMethod,
) {
  return t(WALLET_PROVIDER_KEYS[provider]);
}

export function getAuthMethodLabel(t: AuthTranslate, method: AuthMethod) {
  return t(AUTH_METHOD_KEYS[method]);
}

export function getOnboardingFlowCopy(t: AuthTranslate) {
  return {
    progress: (step: number, total: number) => t("onboardingFlow.progress", { step, total }),
    welcomeSuccess: t("onboardingFlow.welcomeSuccess"),
    genericError: t("onboardingFlow.genericError"),
    actions: {
      back: t("onboardingFlow.actions.back"),
      continue: t("onboardingFlow.actions.continue"),
      retry: t("onboardingFlow.actions.retry"),
    },
    username: {
      title: t("onboardingFlow.username.title"),
      description: t("onboardingFlow.username.description"),
      label: t("onboardingFlow.username.label"),
      placeholder: t("onboardingFlow.username.placeholder"),
      taken: t("onboardingFlow.username.taken"),
      minLength: t("onboardingFlow.username.minLength"),
    },
    role: {
      title: t("onboardingFlow.role.title"),
      description: t("onboardingFlow.role.description"),
      options: ONBOARDING_ROLE_IDS.map((id) => ({
        id,
        title: t(`onboardingFlow.role.options.${id}`),
      })),
    },
    usage: {
      title: t("onboardingFlow.usage.title"),
      description: t("onboardingFlow.usage.description"),
      options: ONBOARDING_USAGE_IDS.map((id) => ({
        id,
        title: t(`onboardingFlow.usage.options.${id}.title`),
        description: t(`onboardingFlow.usage.options.${id}.description`),
      })),
    },
    voice: {
      title: t("onboardingFlow.voice.title"),
      description: t("onboardingFlow.voice.description"),
      defaultLoadError: t("onboardingFlow.voice.defaultLoadError"),
      emptyList: t("onboardingFlow.voice.emptyList"),
      settingUp: t("onboardingFlow.voice.settingUp"),
      completeSetup: t("onboardingFlow.voice.completeSetup"),
    },
  };
}
