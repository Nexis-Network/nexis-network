import type { TranslationValues } from "@/i18n/translate";

type AppTranslate = (key: string, values?: TranslationValues) => string;

const APP_ONBOARDING_STEPS = [
  { id: "sidebar-navigation", targetId: "app-sidebar", key: "sidebar" },
  { id: "wallets-panel", targetId: "wallets", key: "wallets" },
  { id: "tasks-panel", targetId: "tasks", key: "tasks" },
  { id: "history-panel", targetId: "chat-history", key: "history" },
  { id: "command-search", targetId: "app-header-search", key: "search" },
  { id: "remote-status", targetId: "remote-status-badge", key: "remoteStatus" },
  { id: "chat-feed", targetId: "chat-feed", key: "chatFeed" },
  { id: "chat-composer", targetId: "chat-composer", key: "composer" },
] as const;

export function getCountrySelectorCopy(t: AppTranslate) {
  return {
    title: t("countrySelector.title"),
    description: t("countrySelector.description"),
    searchPlaceholder: t("countrySelector.searchPlaceholder"),
    noResults: t("countrySelector.noResults"),
    noOptions: t("countrySelector.noOptions"),
    placeholder: t("countrySelector.placeholder"),
    selectedAria: (country: string) => t("countrySelector.selectedAria", { country }),
    openAria: t("countrySelector.openAria"),
  };
}

export function getDashboardFooterCopy(t: AppTranslate) {
  return {
    live: t("footer.live"),
    legal: {
      terms: t("footer.legal.terms"),
      privacy: t("footer.legal.privacy"),
      changelog: t("footer.legal.changelog"),
      docs: t("footer.legal.docs"),
      portal: t("footer.legal.portal"),
    },
    store: {
      appleComingSoon: t("footer.store.appleComingSoon"),
      googleComingSoon: t("footer.store.googleComingSoon"),
      comingSoonTitle: t("footer.store.comingSoonTitle"),
    },
    social: {
      discord: t("footer.social.discord"),
      youtube: t("footer.social.youtube"),
      twitter: t("footer.social.twitter"),
      github: t("footer.social.github"),
    },
    metrics: {
      eth: t("footer.metrics.eth"),
      gas: t("footer.metrics.gas"),
    },
    selectRegion: t("footer.selectRegion"),
  };
}

export function getAppOnboardingGuideCopy(t: AppTranslate) {
  return {
    skipAria: t("guide.skipAria"),
    stepLabel: (step: number, total: number) => t("guide.stepLabel", { step, total }),
    back: t("guide.back"),
    skip: t("guide.skip"),
    next: t("guide.next"),
    finish: t("guide.finish"),
    steps: APP_ONBOARDING_STEPS.map((step) => ({
      id: step.id,
      targetId: step.targetId,
      title: t(`guide.steps.${step.key}.title`),
      description: t(`guide.steps.${step.key}.description`),
    })),
  };
}

export function getWalletSidebarCopy(t: AppTranslate) {
  return {
    embeddedSwitcher: {
      selectWallet: t("walletSidebar.embeddedSwitcher.selectWallet"),
      embeddedWallets: t("walletSidebar.embeddedSwitcher.embeddedWallets"),
      embeddedSolanaWallet: t("walletSidebar.embeddedSwitcher.embeddedSolanaWallet"),
      embeddedEvmWallet: t("walletSidebar.embeddedSwitcher.embeddedEvmWallet"),
      solanaWallet: t("walletSidebar.embeddedSwitcher.solanaWallet"),
      evmWallet: t("walletSidebar.embeddedSwitcher.evmWallet"),
    },
    carousel: {
      title: t("walletSidebar.carousel.title"),
      allHidden: t("walletSidebar.carousel.allHidden"),
      noWallets: t("walletSidebar.carousel.noWallets"),
      createWallet: t("walletSidebar.carousel.createWallet"),
      showHiddenWallets: t("walletSidebar.carousel.showHiddenWallets"),
      createWalletCta: t("walletSidebar.carousel.createWalletCta"),
    },
    card: {
      provisioning: t("walletSidebar.card.provisioning"),
      walletNetWorth: t("walletSidebar.card.walletNetWorth"),
      changeSyncing: t("walletSidebar.card.changeSyncing"),
      openWalletActions: t("walletSidebar.card.openWalletActions"),
      viewOnExplorer: t("walletSidebar.card.viewOnExplorer"),
      exportPrivateKey: t("walletSidebar.card.exportPrivateKey"),
      hideWallet: t("walletSidebar.card.hideWallet"),
      receiveWalletAssets: t("walletSidebar.card.receiveWalletAssets"),
      actions: {
        send: t("walletSidebar.card.actions.send"),
        receive: t("walletSidebar.card.actions.receive"),
        swap: t("walletSidebar.card.actions.swap"),
      },
      chain: {
        solana: t("walletSidebar.card.chain.solana"),
        evm: t("walletSidebar.card.chain.evm"),
      },
      identity: {
        cdpV2Solana: t("walletSidebar.card.identity.cdpV2Solana"),
        cdpV2Evm: t("walletSidebar.card.identity.cdpV2Evm"),
        eoa: t("walletSidebar.card.identity.eoa"),
        smartWallet: t("walletSidebar.card.identity.smartWallet"),
        wallet: t("walletSidebar.card.identity.wallet"),
      },
    },
  };
}
