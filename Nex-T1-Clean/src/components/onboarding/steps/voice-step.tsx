"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { VoicePicker } from "@/components/ui/voice-picker";
import { extractApiErrorMessage, extractVoicesFromPayload } from "./voice-step-response";
import dynamic from "next/dynamic";
const Orb = dynamic(() => import("@/components/ui/orb").then((mod) => mod.Orb), {
    ssr: false,
    loading: () => <div className="h-40 w-40 rounded-full bg-muted/20 animate-pulse" />,
});
import { getVoiceColor } from "@/lib/utils/voice-colors";
import { getOnboardingFlowCopy } from "@/modules/auth/i18n";

import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";


import { logger } from '@/lib/logger';
interface VoiceStepProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onBack: () => void;
    isSubmitting: boolean;
    submitLabel?: string;
    submitErrorMessage?: string | null;
}
export function VoiceStep({
    value,
    onChange,
    onSubmit,
    onBack,
    isSubmitting,
    submitLabel,
    submitErrorMessage,
}: VoiceStepProps) {
    const t = useTranslations("auth");
    const copy = getOnboardingFlowCopy(t);
    const [voices, setVoices] = React.useState<ElevenLabs.Voice[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    const fetchVoices = React.useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/elevenlabs/voices", { cache: "no-store" });
            let payload: UntypedJson = null;

            try {
                payload = await response.json();
            } catch (jsonError) {
                logger.error("Failed to parse voices response payload", jsonError);
            }

            if (!response.ok) {
                const apiMessage = extractApiErrorMessage(payload);
                throw new Error(apiMessage ?? `Voice request failed with status ${response.status}`);
            }

            const fetchedVoices = extractVoicesFromPayload(payload);
            setVoices(fetchedVoices);

            if (fetchedVoices.length === 0) {
                setErrorMessage(copy.voice.emptyList);
            }
        } catch (error) {
            logger.error("Failed to fetch voices", error);
            setVoices([]);
            if (error instanceof Error && error.message.trim().length > 0) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage(copy.voice.defaultLoadError);
            }
        } finally {
            setIsLoading(false);
        }
    }, [copy.voice.defaultLoadError, copy.voice.emptyList]);

    React.useEffect(() => {
        fetchVoices();
    }, [fetchVoices]);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-[28px] font-medium leading-[39px] tracking-[-0.16px] text-white">
                    {copy.voice.title}
                </h1>
                <p className="text-[14px] font-normal leading-[22px] tracking-[-0.16px] text-[#808793]">
                    {copy.voice.description}
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-8 py-4">
                    <div className="relative flex h-64 w-full items-center justify-center overflow-visible">
                        {/* Orb visualization */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Orb
                                agentState="thinking"
                                variant="agent"
                                colors={value ? getVoiceColor(value) : ["#04F4FE", "#04F4FE"]}
                                className="h-64 w-64"
                            />
                        </div>
                    </div>

                    <div className="w-full max-w-xs">
                        {isLoading ? (
                            <div className="flex justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : voices.length === 0 ? (
                            <div className="space-y-3 text-center text-sm text-muted-foreground">
                                <p>{errorMessage ?? copy.voice.defaultLoadError}</p>
                                <div className="flex justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={fetchVoices}
                                        disabled={isLoading}
                                        className="border-[#36393F] bg-transparent text-white hover:bg-white/5"
                                    >
                                        {copy.actions.retry}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <VoicePicker
                                voices={voices}
                                value={value}
                                onValueChange={onChange}
                            />
                        )}
                    </div>
                </div>

                <div className="flex w-full gap-4">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="flex-1 border-[#36393F] bg-transparent text-white hover:bg-white/5"
                        disabled={isSubmitting}
                        size="lg"
                    >
                        {copy.actions.back}
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={!value || isSubmitting}
                        className="flex-1 bg-white text-black hover:bg-white/90"
                        size="lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {copy.voice.settingUp}
                            </>
                        ) : (
                            submitLabel ?? copy.voice.completeSetup
                        )}
                    </Button>
                </div>
                {submitErrorMessage ? (
                    <p className="text-sm text-red-400">{submitErrorMessage}</p>
                ) : null}
            </div>
        </div>
    );
}
