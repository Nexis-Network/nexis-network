import type { TranslationValues } from "@/i18n/translate";

type SettingsTranslate = (key: string, values?: TranslationValues) => string;

export function getSettingsRailCopy(t: SettingsTranslate) {
  return {
    logoAlt: t("logoAlt"),
    railAria: t("rail.sectionsAria"),
    railTitle: t("rail.title"),
    railDescription: t("rail.description"),
  };
}

export function getSettingsRightRailCopy(t: SettingsTranslate) {
  return {
    finance: {
      title: t("rightRail.finance.title"),
      description: t("rightRail.finance.description"),
      itemOne: t("rightRail.finance.itemOne"),
      itemTwo: t("rightRail.finance.itemTwo"),
    },
    activity: {
      title: t("rightRail.activity.title"),
      description: t("rightRail.activity.description"),
      linkLabel: t("rightRail.activity.linkLabel"),
      body: t("rightRail.activity.body"),
    },
    agents: {
      title: t("rightRail.agents.title"),
      description: t("rightRail.agents.description"),
      itemOne: t("rightRail.agents.itemOne"),
      itemTwo: t("rightRail.agents.itemTwo"),
    },
    integrations: {
      title: t("rightRail.integrations.title"),
      description: t("rightRail.integrations.description"),
      itemOne: t("rightRail.integrations.itemOne"),
      itemTwo: t("rightRail.integrations.itemTwo"),
    },
    security: {
      title: t("rightRail.security.title"),
      description: t("rightRail.security.description"),
      itemOne: t("rightRail.security.itemOne"),
      itemTwo: t("rightRail.security.itemTwo"),
    },
    workspace: {
      title: t("rightRail.workspace.title"),
      description: t("rightRail.workspace.description"),
      body: t("rightRail.workspace.body"),
    },
    developer: {
      title: t("rightRail.developer.title"),
      description: t("rightRail.developer.description"),
      body: t("rightRail.developer.body"),
    },
  };
}

export function getSettingsWalletSwitcherCopy(t: SettingsTranslate) {
  return {
    baseSmartWallet: t("walletSwitcher.baseSmartWallet"),
    solanaEmbeddedWallet: t("walletSwitcher.solanaEmbeddedWallet"),
    selectWallet: t("walletSwitcher.selectWallet"),
    chainAlt: (label: string) => t("walletSwitcher.chainAlt", { label }),
    actions: {
      send: t("walletSwitcher.actions.send"),
      receive: t("walletSwitcher.actions.receive"),
      swap: t("walletSwitcher.actions.swap"),
      buy: t("walletSwitcher.actions.buy"),
      buyUnavailable: t("walletSwitcher.actions.buyUnavailable"),
      exportPrivateKey: t("walletSwitcher.actions.exportPrivateKey"),
      exportUnavailable: t("walletSwitcher.actions.exportUnavailable"),
    },
    toasts: {
      buyOnlyBase: t("walletSwitcher.toasts.buyOnlyBase"),
      exportOnlySolana: t("walletSwitcher.toasts.exportOnlySolana"),
    },
  };
}

export function getSettingsConnectionsPageCopy(t: SettingsTranslate) {
  return {
    title: t("tabs.connections"),
    description: t("connectionsPage.description"),
  };
}

export function getSettingsProvidersCardCopy(t: SettingsTranslate) {
  return {
    title: t("providersCard.title"),
    description: t("providersCard.description"),
    empty: t("providersCard.empty"),
    oauthStartFailed: t("providersCard.oauthStartFailed"),
  };
}

export function getSettingsIntegrationsCardCopy(t: SettingsTranslate) {
  return {
    title: t("integrationsCard.title"),
    loadingDescription: t("integrationsCard.loadingDescription"),
    errorDescription: t("integrationsCard.errorDescription"),
    defaultDescription: t("integrationsCard.defaultDescription"),
    empty: t("integrationsCard.empty"),
    connected: t("integrationsCard.connected"),
    scopes: (scopes: string) => t("integrationsCard.scopes", { scopes }),
    lastSynced: (date: string) => t("integrationsCard.lastSynced", { date }),
    neverSynced: t("integrationsCard.neverSynced"),
  };
}

export function getProfileIntegrationsCardCopy(t: SettingsTranslate) {
  return {
    title: t("profileIntegrations.title"),
    description: t("profileIntegrations.description"),
    connectedBadge: (count: number) => t("profileIntegrations.connectedBadge", { count }),
    oauthApps: t("profileIntegrations.oauthApps"),
    apiKeys: t("profileIntegrations.apiKeys"),
    manageConnections: t("profileIntegrations.manageConnections"),
    manageApiKeys: t("profileIntegrations.manageApiKeys"),
    active: (count: number) => t("profileIntegrations.active", { count }),
  };
}

export function getProfileAccountSummaryCopy(t: SettingsTranslate) {
  const nextStepLabels: Record<string, string> = {
    "display-name": t("accountSummary.nextSteps.addDisplayName"),
    "icon-style": t("accountSummary.nextSteps.chooseIconStyle"),
    username: t("accountSummary.nextSteps.claimUsername"),
    bio: t("accountSummary.nextSteps.writeShortBio"),
    locale: t("accountSummary.nextSteps.setLocaleTimeZone"),
    "email-verified": t("accountSummary.nextSteps.verifyEmailAddress"),
    mfa: t("accountSummary.nextSteps.enableMfa"),
  };

  return {
    title: t("accountSummary.title"),
    description: t("accountSummary.description"),
    profileCompletion: t("accountSummary.profileCompletion"),
    stepsComplete: (completed: number, total: number) =>
      t("accountSummary.stepsComplete", { completed, total }),
    suggestedNextSteps: t("accountSummary.suggestedNextSteps"),
    profileLooksGreat: t("accountSummary.profileLooksGreat"),
    fields: {
      displayName: t("accountSummary.fields.displayName"),
      username: t("accountSummary.fields.username"),
      primaryEmail: t("accountSummary.fields.primaryEmail"),
      localeTimeZone: t("accountSummary.fields.localeTimeZone"),
      lastLogin: t("accountSummary.fields.lastLogin"),
      riskScore: t("accountSummary.fields.riskScore"),
    },
    fallback: {
      notSet: t("accountSummary.fallback.notSet"),
      setDisplayName: t("accountSummary.fallback.setDisplayName"),
      claimUsername: t("accountSummary.fallback.claimUsername"),
      unknown: t("accountSummary.fallback.unknown"),
      setLocaleTimeZone: t("accountSummary.fallback.setLocaleTimeZone"),
      noRecentSessions: t("accountSummary.fallback.noRecentSessions"),
      na: t("accountSummary.fallback.na"),
      noRiskData: t("accountSummary.fallback.noRiskData"),
    },
    emailStatus: {
      verified: t("accountSummary.emailStatus.verified"),
      verificationRequired: t("accountSummary.emailStatus.verificationRequired"),
    },
    nextStepLabel: (id: string, fallback: string) => nextStepLabels[id] ?? fallback,
  };
}

export function getProfileQuickActionsCopy(t: SettingsTranslate) {
  return {
    title: t("quickActionsCard.title"),
    actions: [
      {
        id: "invite",
        label: t("quickActionsCard.actions.invite.label"),
        description: t("quickActionsCard.actions.invite.description"),
        href: "/settings/invitations",
      },
      {
        id: "api-key",
        label: t("quickActionsCard.actions.apiKey.label"),
        description: t("quickActionsCard.actions.apiKey.description"),
        href: "/settings/developer/api-keys",
      },
      {
        id: "connect-wallet",
        label: t("quickActionsCard.actions.connectWallet.label"),
        description: t("quickActionsCard.actions.connectWallet.description"),
        href: "/settings/wallets",
      },
    ],
  };
}

export function getProfileUsageCardCopy(t: SettingsTranslate) {
  return {
    title: t("usageCard.title"),
    description: t("usageCard.description"),
    last30Days: t("usageCard.last30Days"),
    metrics: [
      { id: "chats", label: t("usageCard.metrics.chats30d") },
      { id: "artifacts", label: t("usageCard.metrics.artifacts30d") },
      { id: "promptTokens", label: t("usageCard.metrics.promptTokens7d") },
      { id: "completionTokens", label: t("usageCard.metrics.completionTokens7d") },
    ],
  };
}
