"use client";

import { useMemo, useState } from "react";

import { getSocialProviders, getWalletProviders } from "@/components/auth/login/constants";
import type { AuthMethod, ProviderButton, WalletAuthMethod } from "@/components/auth/login/types";
import type { MagicLinkStatusCopy } from "@/lib/auth/magic-link";
import { useTranslations } from "@/components/providers/locale-provider";
import type { ProviderMap } from "@/hooks/auth/use-auth-providers";

import { EntryStepPanel } from "./entry-step-panel";

export type EntryStepProps = {
  authMethod?: AuthMethod;
  mode?: "sign-in" | "sign-up";
  identifier?: string;
  loading?: boolean;
  otpLoading?: boolean;
  availableProviders: ProviderMap;
  providersResolved?: boolean;
  onOAuthSelect: (provider: ProviderButton) => void;
  onAuthMethodSelect?: (method: AuthMethod) => void;
  onAuthMethodChange?: (method: AuthMethod) => void;
  onWalletSelect?: (method: WalletAuthMethod) => void;
  walletConnectEnabled?: boolean;
  passkeyEnabled?: boolean;
  onIdentifierChange?: (value: string) => void;
  onBegin?: () => void;
  hasAcceptedPolicies?: boolean;
  onHasAcceptedPoliciesChange?: (value: boolean) => void;
  magicLinkStatus?: MagicLinkStatusCopy | null;
};

export function EntryStep({
  availableProviders,
  onOAuthSelect,
  onAuthMethodSelect,
  onAuthMethodChange,
  onBegin,
  hasAcceptedPolicies,
  onHasAcceptedPoliciesChange,
  magicLinkStatus,
  authMethod,
  onWalletSelect,
  walletConnectEnabled = true,
  passkeyEnabled = false,
}: EntryStepProps) {
  const t = useTranslations("auth");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const socialProviders = useMemo(() => getSocialProviders(t), [t]);
  const enabledSocialProviders = useMemo(
    () => socialProviders.filter((provider) => availableProviders.has(provider.id)),
    [availableProviders, socialProviders],
  );
  const walletProviders = useMemo(() => getWalletProviders(t), [t]);
  const primaryWalletProviders = walletProviders.filter((provider) => provider.id !== "walletconnect");
  const secondaryWalletProviders = walletProviders.filter((provider) => provider.id === "walletconnect");

  return (
    <EntryStepPanel
      t={t}
      showMoreOptions={showMoreOptions}
      setShowMoreOptions={setShowMoreOptions}
      enabledSocialProviders={enabledSocialProviders}
      primaryWalletProviders={primaryWalletProviders}
      secondaryWalletProviders={secondaryWalletProviders}
      walletConnectEnabled={walletConnectEnabled}
      passkeyEnabled={passkeyEnabled}
      authMethod={authMethod}
      onOAuthSelect={onOAuthSelect}
      onAuthMethodSelect={onAuthMethodSelect}
      onAuthMethodChange={onAuthMethodChange}
      onWalletSelect={onWalletSelect}
      onBegin={onBegin}
      hasAcceptedPolicies={hasAcceptedPolicies}
      onHasAcceptedPoliciesChange={onHasAcceptedPoliciesChange}
      magicLinkStatus={magicLinkStatus}
    />
  );
}
