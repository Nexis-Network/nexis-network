"use client";

import dynamic from "next/dynamic";

import type { LoginProps, WalletAuthMethod } from "@/components/auth/login/types";
import { EntryStep } from "@/components/auth/login/steps/entry-step";
import { IdentifierStep } from "@/components/auth/login/steps/identifier-step";
import { CredentialStep } from "@/components/auth/login/steps/credential-step";
import { OtpStep } from "@/components/auth/login/steps/otp-step";
import { ForgotPasswordStep } from "@/components/auth/login/steps/forgot-password-step";
import { WalletStep } from "@/components/auth/login/steps/wallet-step";
import { LoginShell } from "@/components/auth/login/login-shell";
import { useLoginController } from "@/hooks/auth/use-login-controller";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/providers/locale-provider";

function PasskeyLoadingFallback() {
  const t = useTranslations("auth");

  return <StepPlaceholder message={t("loading.preparingPasskey")} />;
}

const PasskeyStep = dynamic(
  () => import("@/components/auth/login/steps/passkey-step").then((mod) => ({ default: mod.PasskeyStep })),
  {
    ssr: false,
    loading: () => <PasskeyLoadingFallback />,
  },
);

function StepPlaceholder({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function Login(props: LoginProps) {
  const t = useTranslations("auth");
  const controller = useLoginController(props);
  const {
    supabaseClient,
    isCheckingAuth,
    isAuthenticated,
    step,
    header,
    authMethod,
    mode,
    identifier,
    loading,
    otpLoading,
    walletLoading,
    walletError,
    walletConnectEnabled,
    passkeyEnabled,
    availableProviders,
    providersResolved,
    magicLinkStatus,
    hasAcceptedPolicies,
    password,
    confirmPassword,
    normalizedIdentifierValue,
    otpCode,
    otpCountdown,
    beginCredentialStep,
    handleOAuth,
    handleCredentialSubmit,
    handleBackToEntry,
    handleModeToggle,
    handleOtpSubmit,
    handleResendOtp,
    handleUseDifferentNumber,
    handleOtpCodeChange,
    handleIdentifierChange,
    handleHasAcceptedPoliciesChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleAuthMethodSelect,
    handleWalletMethodSelect,
    handlePasskeyAuth,
    handleWalletAuth,
    handleForgotPassword,
    handleForgotPasswordSubmit,
  } = controller;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadingShell = (
    <LoginShell step={step} header={header}>
      <StepPlaceholder message={t("loading.checkingSession")} />
    </LoginShell>
  );

  if (!mounted) {
    return loadingShell;
  }

  if (!supabaseClient) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <h2 className="text-xl font-regular">{t("unavailable.title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("unavailable.body")}
        </p>
      </div>
    );
  }

  if (isCheckingAuth) {
    return loadingShell;
  }

  if (isAuthenticated) {
    return null;
  }

  const content = (() => {
    switch (step) {
      case "credentials":
        return (
          <CredentialStep
            authMethod={authMethod}
            mode={mode}
            loading={loading}
            password={password}
            confirmPassword={confirmPassword}
            hasAcceptedPolicies={hasAcceptedPolicies}
            normalizedIdentifier={normalizedIdentifierValue}
            headerLabel={header.primaryLabel}
            onBack={handleBackToEntry}
            onSubmit={handleCredentialSubmit}
            onPasswordChange={handlePasswordChange}
            onConfirmPasswordChange={handleConfirmPasswordChange}
            onLegalConsentChange={handleHasAcceptedPoliciesChange}
            onModeToggle={handleModeToggle}
            onForgotPassword={handleForgotPassword}
          />
        );
      case "otp":
        return (
          <OtpStep
            destinationLabel={normalizedIdentifierValue}
            otpCode={otpCode}
            otpLoading={otpLoading}
            otpCountdown={otpCountdown}
            loading={loading}
            onBack={handleBackToEntry}
            onCodeChange={handleOtpCodeChange}
            onSubmit={handleOtpSubmit}
            onResend={handleResendOtp}
            onUseDifferentNumber={handleUseDifferentNumber}
          />
        );
      case "passkey":
        return <PasskeyStep onBack={handleBackToEntry} onBegin={handlePasskeyAuth} />;
      case "wallet":
        return (
          <WalletStep
            method={authMethod as WalletAuthMethod}
            mode={mode}
            loading={walletLoading}
            error={walletError}
            hasAcceptedPolicies={hasAcceptedPolicies}
            onHasAcceptedPoliciesChange={handleHasAcceptedPoliciesChange}
            onBack={handleBackToEntry}
            onBegin={handleWalletAuth}
          />
        );
      case "entry":
        return (
          <EntryStep
            availableProviders={availableProviders}
            providersResolved={providersResolved}
            onOAuthSelect={handleOAuth}
            onAuthMethodSelect={handleAuthMethodSelect}
            onWalletSelect={handleWalletMethodSelect}
            walletConnectEnabled={walletConnectEnabled}
            passkeyEnabled={passkeyEnabled}
          />
        );
      case "identifier":
        if (magicLinkStatus?.requested) {
          return (
            <div className="flex flex-col items-center justify-center space-y-6 pt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-full bg-primary/10 p-4 text-primary ring-1 ring-primary/20">
                <MailCheck className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">{t("magicLink.checkInboxTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                  {t("magicLink.checkInboxBody", { email: magicLinkStatus.email })}
                </p>
              </div>
              <div className="pt-4">
                <Button variant="ghost" onClick={handleBackToEntry} className="text-muted-foreground hover:text-foreground">
                  {t("magicLink.backToLogin")}
                </Button>
              </div>
            </div>
          );
        }
        return (
          <IdentifierStep
            authMethod={authMethod}
            mode={mode}
            identifier={identifier}
            loading={loading}
            otpLoading={otpLoading}
            onBack={handleBackToEntry}
            onIdentifierChange={handleIdentifierChange}
            onBegin={beginCredentialStep}
            hasAcceptedPolicies={hasAcceptedPolicies}
            onHasAcceptedPoliciesChange={handleHasAcceptedPoliciesChange}
          />
        );
      case "forgot-password":
        return (
          <ForgotPasswordStep
            email={identifier}
            loading={loading}
            onBack={handleBackToEntry}
            onSubmit={handleForgotPasswordSubmit}
            onEmailChange={handleIdentifierChange}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <LoginShell step={step} header={header}>
      {content}
    </LoginShell>
  );
}

export default Login;
