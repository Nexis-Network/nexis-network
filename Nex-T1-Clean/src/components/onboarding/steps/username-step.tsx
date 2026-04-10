"use client";

import * as React from "react";
import { useDebounce } from "use-debounce";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/components/providers/locale-provider";
import { normalizeEnsSubnameLabel } from "@/lib/ens/subnames";
import { checkUsernameAvailability } from "@/server/actions/onboarding";
import { cn } from "@/lib/utils";
import { getOnboardingFlowCopy } from "@/modules/auth/i18n";


import { logger } from '@/lib/logger';
interface UsernameStepProps {
    value: string;
    onChange: (value: string) => void;
    onNext: () => void;
}

export function UsernameStep({ value, onChange, onNext }: UsernameStepProps) {
    const t = useTranslations("auth");
    const copy = getOnboardingFlowCopy(t);
    const [isChecking, setIsChecking] = React.useState(false);
    const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null);
    const [debouncedValue] = useDebounce(value, 500);

    React.useEffect(() => {
        const check = async () => {
            if (!debouncedValue || debouncedValue.length < 3) {
                setIsAvailable(null);
                return;
            }

            setIsChecking(true);
            try {
                const result = await checkUsernameAvailability(debouncedValue);
                setIsAvailable(result.available);
            } catch (error) {
                logger.error("Failed to check username", error);
                setIsAvailable(null);
            } finally {
                setIsChecking(false);
            }
        };

        check();
    }, [debouncedValue]);

    const isValid = value.length >= 3 && isAvailable === true;

    return (
        <div className="space-y-8 w-full">
            <div className="space-y-2">
                <h1 className="text-[28px] font-medium leading-[39px] tracking-[-0.16px] text-white">{copy.username.title}</h1>
                <p className="text-[14px] font-normal leading-[22px] tracking-[-0.16px] text-[#808793]">
                    {copy.username.description}
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="username" className="text-white">{copy.username.label}</Label>
                    <div className="relative">
                        <Input
                            id="username"
                            placeholder={copy.username.placeholder}
                            value={value}
                            onChange={(e) => {
                                onChange(normalizeEnsSubnameLabel(e.target.value));
                                setIsAvailable(null);
                            }}
                            className={cn(
                                "bg-transparent border-[#36393F] text-white placeholder:text-[#808793] focus-visible:ring-[#0BA0A6]",
                                isAvailable === true
                                    ? "border-[#0BA0A6] focus-visible:ring-[#0BA0A6]"
                                    : isAvailable === false
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : ""
                            )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isChecking ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : isAvailable === true ? (
                                <Check className="h-4 w-4 text-[#0BA0A6]" />
                            ) : isAvailable === false ? (
                                <X className="h-4 w-4 text-red-500" />
                            ) : null}
                        </div>
                    </div>
                    {isAvailable === false && (
                        <p className="text-sm text-red-500">{copy.username.taken}</p>
                    )}
                    {value.length > 0 && value.length < 3 && (
                        <p className="text-sm text-muted-foreground">
                            {copy.username.minLength}
                        </p>
                    )}
                </div>

                <Button
                    onClick={onNext}
                    disabled={!isValid || isChecking}
                    className="w-full bg-white text-black hover:bg-white/90"
                    size="lg"
                >
                    {copy.actions.continue}
                </Button>
            </div>
        </div>
    );
}
