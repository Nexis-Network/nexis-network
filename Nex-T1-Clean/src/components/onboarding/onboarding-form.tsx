"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { useTranslations } from "@/components/providers/locale-provider";
import { UsernameStep } from "./steps/username-step";
import { RoleStep } from "./steps/role-step";
import { UsageStep } from "./steps/usage-step";
import { VoiceStep } from "./steps/voice-step";
import { getOnboardingFlowCopy } from "@/modules/auth/i18n";
import { ENS_SUBNAME_CLAIM_ENABLED } from "@/modules/ens/feature";
import { submitOnboarding } from "@/server/actions/onboarding";

import { logger } from "@/lib/logger";

const EnsSubnameStep = ENS_SUBNAME_CLAIM_ENABLED
    ? dynamic(() => import("./steps/ens-subname-step").then((mod) => mod.EnsSubnameStep), {
        ssr: false,
        loading: () => null,
    })
    : null;
export type OnboardingState = {
    username: string;
    role: string;
    usage: string;
    voiceId: string;
};

const INITIAL_STATE: OnboardingState = {
    username: "",
    role: "",
    usage: "",
    voiceId: "",
};

export function OnboardingForm() {
    const t = useTranslations("auth");
    const copy = getOnboardingFlowCopy(t);
    const router = useRouter();
    const [step, setStep] = React.useState(1);
    const [formData, setFormData] = React.useState<OnboardingState>(INITIAL_STATE);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    const totalSteps = ENS_SUBNAME_CLAIM_ENABLED ? 5 : 4;

    const updateFormData = (updates: Partial<OnboardingState>) => {
        setSubmitError(null);
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const nextStep = React.useCallback(() => {
        setStep((prev) => Math.min(prev + 1, totalSteps));
    }, [totalSteps]);

    const prevStep = React.useCallback(() => {
        setStep((prev) => Math.max(prev - 1, 1));
    }, []);

    const handleVoiceSubmit = React.useCallback(async () => {
        if (ENS_SUBNAME_CLAIM_ENABLED) {
            nextStep();
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const result = await submitOnboarding(formData, {
                onboardingCompleted: true,
            });

            if (result?.error) {
                setSubmitError(result.error);
                return;
            }

            router.refresh();
            router.push("/app");
        } catch (error) {
            logger.error("Failed to complete onboarding without ENS", error);
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : "Failed to complete onboarding.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, nextStep, router]);

    return (
        <div className="relative w-full">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex space-x-2">
                    {Array.from({ length: totalSteps }, (_, index) => index + 1).map((i) => (
                        <div
                            key={i}
                            className={`h-1 w-8 rounded-full transition-colors duration-300 ${i <= step ? "bg-primary" : "bg-secondary"}`}
                        />
                    ))}
                </div>
                <span className="text-sm font-medium text-[#808793]">
                    {copy.progress(step, totalSteps)}
                </span>
            </div>

            <div>
                {step === 1 && (
                    <UsernameStep
                        value={formData.username}
                        onChange={(username: string) => updateFormData({ username })}
                        onNext={nextStep}
                    />
                )}
                {step === 2 && (
                    <RoleStep
                        value={formData.role}
                        onChange={(role: string) => updateFormData({ role })}
                        onNext={nextStep}
                        onBack={prevStep}
                    />
                )}
                {step === 3 && (
                    <UsageStep
                        value={formData.usage}
                        onChange={(usage: string) => updateFormData({ usage })}
                        onNext={nextStep}
                        onBack={prevStep}
                    />
                )}
                {step === 4 && (
                    <VoiceStep
                        value={formData.voiceId}
                        onChange={(voiceId: string) => updateFormData({ voiceId })}
                        onSubmit={() => {
                            void handleVoiceSubmit();
                        }}
                        onBack={prevStep}
                        isSubmitting={isSubmitting}
                        submitLabel={ENS_SUBNAME_CLAIM_ENABLED ? copy.actions.continue : undefined}
                        submitErrorMessage={submitError}
                    />
                )}
                {ENS_SUBNAME_CLAIM_ENABLED && step === 5 && EnsSubnameStep ? (
                    <EnsSubnameStep
                        onboardingData={formData}
                        onBack={prevStep}
                    />
                ) : null}
            </div>
        </div>
    );
}
