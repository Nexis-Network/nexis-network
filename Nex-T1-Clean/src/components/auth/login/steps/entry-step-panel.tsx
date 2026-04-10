"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Fingerprint, Mail, Phone, Sparkles } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { WalletConnectorContent } from "@/components/wallets/wallet-connector-content";
import type { AuthMethod, ProviderButton, WalletAuthMethod, WalletProvider } from "@/components/auth/login/types";
import type { MagicLinkStatusCopy } from "@/lib/auth/magic-link";
import type { TranslationValues } from "@/i18n/translate";
import { EntryStepMagicLinkPanel } from "./entry-step-magic-link-panel";
import {
  authEntryActionButtonClassName,
  authEntryActionIconClassName,
  authEntryActionLabelClassName,
  authEntrySecondaryButtonClassName,
} from "./entry-step-classes";
type Translator = (key: string, values?: TranslationValues) => string;

type EntryStepPanelProps = {
  t: Translator;
  showMoreOptions: boolean;
  setShowMoreOptions: (value: boolean) => void;
  enabledSocialProviders: ProviderButton[];
  primaryWalletProviders: WalletProvider[];
  secondaryWalletProviders: WalletProvider[];
  walletConnectEnabled: boolean;
  passkeyEnabled: boolean;
  authMethod?: AuthMethod;
  onOAuthSelect: (provider: ProviderButton) => void;
  onAuthMethodSelect?: (method: AuthMethod) => void;
  onAuthMethodChange?: (method: AuthMethod) => void;
  onWalletSelect?: (method: WalletAuthMethod) => void;
  onBegin?: () => void;
  hasAcceptedPolicies?: boolean;
  onHasAcceptedPoliciesChange?: (value: boolean) => void;
  magicLinkStatus?: MagicLinkStatusCopy | null;
};
const handleHoverMove = (event: MouseEvent<HTMLButtonElement>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  const edgeProximity = Math.max(0, 1 - Math.min(x, 100 - x) / 30);
  const edgeWeight = `${Math.min(100, Math.max(0, edgeProximity * 100))}%`;
  event.currentTarget.style.setProperty("--hover-x", `${x}%`);
  event.currentTarget.style.setProperty("--hover-y", `${y}%`);
  event.currentTarget.style.setProperty("--hover-edge-weight", edgeWeight);
};
const handleHoverLeave = (event: MouseEvent<HTMLButtonElement>) => {
  event.currentTarget.style.removeProperty("--hover-x");
  event.currentTarget.style.removeProperty("--hover-y");
  event.currentTarget.style.removeProperty("--hover-edge-weight");
};
export function EntryStepPanel({
  t,
  showMoreOptions,
  setShowMoreOptions,
  enabledSocialProviders,
  primaryWalletProviders,
  secondaryWalletProviders,
  walletConnectEnabled,
  passkeyEnabled,
  authMethod,
  onOAuthSelect,
  onAuthMethodSelect,
  onAuthMethodChange,
  onWalletSelect,
  onBegin,
  hasAcceptedPolicies,
  onHasAcceptedPoliciesChange,
  magicLinkStatus,
}: EntryStepPanelProps): ReactNode {
  const handleAuthMethod = (method: AuthMethod) => {
    onAuthMethodSelect?.(method);
    onAuthMethodChange?.(method);
  };

  const hoverGradientHandlers = {
    onMouseMove: handleHoverMove,
    onMouseLeave: handleHoverLeave,
  } as const;
  const renderWalletProvider = (provider: WalletProvider) => {
    const isEnabled = provider.id !== "walletconnect" || walletConnectEnabled;
    return (
      <button
        key={provider.id}
        type="button"
        aria-label={t("entry.socialButton", { provider: provider.label })}
        onClick={() => {
          if (!isEnabled) return;
          onWalletSelect?.(provider.id);
        }}
        className={cn(authEntryActionButtonClassName, !isEnabled && "cursor-not-allowed opacity-50")}
        disabled={!isEnabled}
        {...hoverGradientHandlers}
      >
        <WalletConnectorContent
          icon={provider.iconSrc ?? "/assets/wallet-logos/Safe-Wallet.svg"}
          label={provider.label}
          description={null}
          labelClassName={cn("text-left", authEntryActionLabelClassName)}
          actionIcon={<ChevronRight className={authEntryActionIconClassName} />}
        />
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {!showMoreOptions ? (
          <>
            <div className="flex w-full flex-col gap-3">
              {enabledSocialProviders.map((provider) => {
                const IconComponent = provider.icon;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    aria-label={t("entry.socialButton", { provider: provider.label })}
                    onClick={() => onOAuthSelect(provider)}
                    className={authEntryActionButtonClassName}
                    {...hoverGradientHandlers}
                  >
                    {provider.iconSrc ? (
                      <Image
                        src={provider.iconSrc}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6"
                      />
                    ) : IconComponent ? (
                      <IconComponent className="h-6 w-6" />
                    ) : null}
                    <span className={cn("flex-1 text-left", authEntryActionLabelClassName)}>
                      {t("entry.socialButton", { provider: provider.label })}
                    </span>
                    <ChevronRight className={authEntryActionIconClassName} />
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex w-full flex-col gap-3">
              {primaryWalletProviders.map(renderWalletProvider)}
            </div>
            <button
              type="button"
              onClick={() => setShowMoreOptions(true)}
              className={authEntrySecondaryButtonClassName}
            >
              <span className={authEntryActionLabelClassName}>{t("entry.viewMore")}</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleAuthMethod("email")}
              className={authEntryActionButtonClassName}
              {...hoverGradientHandlers}
            >
              <Mail className="h-6 w-6" fill="currentColor" />
              <span className={cn("flex-1 text-left", authEntryActionLabelClassName)}>
                {t("entry.continueWithEmail")}
              </span>
              <ChevronRight className={authEntryActionIconClassName} />
            </button>
            <button
              type="button"
              onClick={() => handleAuthMethod("phone")}
              className={authEntryActionButtonClassName}
              {...hoverGradientHandlers}
            >
              <Phone className="h-6 w-6" fill="currentColor" />
              <span className={cn("flex-1 text-left", authEntryActionLabelClassName)}>
                {t("entry.continueWithPhone")}
              </span>
              <ChevronRight className={authEntryActionIconClassName} />
            </button>
            <button
              type="button"
              onClick={() => handleAuthMethod("magic-link")}
              className={authEntryActionButtonClassName}
              {...hoverGradientHandlers}
            >
              <Sparkles className="h-6 w-6" fill="currentColor" />
              <span className={cn("flex-1 text-left", authEntryActionLabelClassName)}>
                {t("entry.continueWithMagicLink")}
              </span>
              <ChevronRight className={authEntryActionIconClassName} />
            </button>
            <button
              type="button"
              onClick={() => handleAuthMethod("email-otp")}
              className={authEntryActionButtonClassName}
              {...hoverGradientHandlers}
            >
              <Mail className="h-6 w-6" />
              <span className={cn("flex-1 text-left", authEntryActionLabelClassName)}>
                {t("entry.continueWithEmailCode")}
              </span>
              <ChevronRight className={authEntryActionIconClassName} />
            </button>
            {passkeyEnabled ? (
              <button
                type="button"
                onClick={() => handleAuthMethod("passkey")}
                className={authEntryActionButtonClassName}
                {...hoverGradientHandlers}
              >
                <Fingerprint className="h-6 w-6" />
                <span className={cn("flex-1 text-left", authEntryActionLabelClassName)}>
                  {t("entry.usePasskey")}
                </span>
                <ChevronRight className={authEntryActionIconClassName} />
              </button>
            ) : null}
            {secondaryWalletProviders.map(renderWalletProvider)}
            <button
              type="button"
              onClick={() => setShowMoreOptions(false)}
              className={cn(authEntrySecondaryButtonClassName, "justify-start")}
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className={authEntryActionLabelClassName}>{t("entry.back")}</span>
            </button>
          </>
        )}
        {authMethod === "magic-link" && magicLinkStatus ? (
          <EntryStepMagicLinkPanel
            t={t}
            status={magicLinkStatus}
            hasAcceptedPolicies={hasAcceptedPolicies}
            onHasAcceptedPoliciesChange={onHasAcceptedPoliciesChange}
            onBegin={onBegin}
          />
        ) : null}
      </div>
    </div>
  );
}
