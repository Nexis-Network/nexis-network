"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthMethod, Mode } from "@/components/auth/login/types";
import { useTranslations } from "@/components/providers/locale-provider";
import { formatPhoneE164, PHONE_FORMAT_HELP } from "@/lib/auth/phone-format";
import { authEntryActionLabelClassName } from "./entry-step-classes";

export type IdentifierStepProps = {
    authMethod: AuthMethod;
    mode: Mode;
    identifier: string;
    loading: boolean;
    otpLoading: boolean;
    onBack: () => void;
    onIdentifierChange: (value: string) => void;
    onBegin: () => void;
    hasAcceptedPolicies: boolean;
    onHasAcceptedPoliciesChange: (value: boolean) => void;
};

export function IdentifierStep({
    authMethod,
    mode,
    identifier,
    loading,
    otpLoading,
    onBack,
    onIdentifierChange,
    onBegin,
    hasAcceptedPolicies,
    onHasAcceptedPoliciesChange,
}: IdentifierStepProps) {
    const t = useTranslations("auth");
    const isPhone = authMethod === "phone";
    const placeholder = isPhone ? t("identifier.phonePlaceholder") : t("identifier.emailPlaceholder");
    const label = isPhone ? t("identifier.phoneNumber") : t("identifier.email");
    const inputType = isPhone ? "tel" : "email";
    const phoneFormat = isPhone ? formatPhoneE164(identifier) : null;

    const continueLabel = (() => {
        if (loading || otpLoading) return t("identifier.working");
        if (authMethod === "magic-link") return t("identifier.sendMagicLink");
        if (authMethod === "email-otp") return t("identifier.emailMeCode");
        if (authMethod === "phone") return t("identifier.textMeCode");
        return mode === "sign-up" ? t("identifier.continueSignUp") : t("identifier.continue");
    })();

    const requiresConsent = mode === "sign-up";

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
                >
                    <ChevronLeft className="opacity-45" />
                </button>
                <h2 className="text-xl font-regular">
                    {authMethod === "phone" ? t("identifier.enterPhoneNumber") : t("identifier.enterEmailAddress")}
                </h2>
                <span className="h-8 w-8 opacity-0" />
            </div>

            <div className="flex flex-col gap-4">
                <div className="space-y-1">
                    <Label htmlFor="identifier" className="text-sm text-muted-foreground">
                        {label}
                    </Label>
                    <Input
                        id="identifier"
                        type={inputType}
                        inputMode={inputType}
                        autoComplete={inputType}
                        placeholder={placeholder}
                        value={identifier}
                        onChange={(event) => onIdentifierChange(event.target.value)}
                        onBlur={(event) => {
                            if (!isPhone) return;
                            const { formatted } = formatPhoneE164(event.target.value);
                            if (formatted && formatted !== event.target.value) {
                                onIdentifierChange(formatted);
                            }
                        }}
                        disabled={loading || otpLoading}
                        autoFocus
                    />
                    {isPhone ? (
                        <div className="space-y-1 pt-1">
                            <p className="text-xs text-muted-foreground">
                                {t("identifier.phoneHelp")}
                            </p>
                            {phoneFormat?.error && identifier.trim().length > 0 ? (
                                <p className="text-xs text-destructive">{PHONE_FORMAT_HELP}</p>
                            ) : null}
                            {!phoneFormat?.error && phoneFormat?.formatted === identifier && identifier.trim().length > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    {t("identifier.willSendCodeTo", { contact: phoneFormat.formatted })}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {requiresConsent ? (
                    <div className="flex items-center gap-3">
                        <Checkbox
                            id="policies"
                            checked={hasAcceptedPolicies}
                            onCheckedChange={(checked) => onHasAcceptedPoliciesChange(Boolean(checked))}
                        />
                        <Label htmlFor="policies" className="text-sm text-muted-foreground">
                            {t("identifier.agreeToPrefix")}{" "}
                            <Link href="/terms" className="text-foreground underline">
                                {t("identifier.terms")}
                            </Link>
                            {" "}{t("legal.and")}{" "}
                            <Link href="/privacy" className="text-foreground underline">
                                {t("legal.privacyPolicy")}
                            </Link>
                        </Label>
                    </div>
                ) : null}

                <Button
                    type="button"
                    className="w-full"
                    onClick={onBegin}
                    disabled={loading || otpLoading || !identifier || (requiresConsent && !hasAcceptedPolicies)}
                >
                    <span className={authEntryActionLabelClassName}>{continueLabel}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
