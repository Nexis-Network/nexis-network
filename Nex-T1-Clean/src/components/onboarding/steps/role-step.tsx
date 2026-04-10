"use client";

import * as React from "react";
import Image from "next/image";
import {
    type LucideIcon,
    ChartLine,
    Image as ImageIcon,
    Coins,
    Megaphone,
    HelpCircle
} from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOnboardingFlowCopy } from "@/modules/auth/i18n";

interface RoleStepProps {
    value: string;
    onChange: (value: string) => void;
    onNext: () => void;
    onBack: () => void;
}

const ROLE_DECORATIONS = {
    crypto_trader: {
        icon: null,
        LucideIcon: ChartLine,
    },
    nft_trader: {
        icon: null,
        LucideIcon: ImageIcon,
    },
    memecoin_degen: {
        icon: null,
        LucideIcon: Coins,
    },
    researcher: {
        icon: "/icons/login-form/researcher.svg",
        LucideIcon: null,
    },
    developer: {
        icon: "/icons/login-form/Developer.svg",
        LucideIcon: null,
    },
    manager: {
        icon: "/icons/login-form/Manager.svg",
        LucideIcon: null,
    },
    kol: {
        icon: null,
        LucideIcon: Megaphone,
    },
    other: {
        icon: null,
        LucideIcon: HelpCircle,
    },
} as const;

type RoleOptionId = keyof typeof ROLE_DECORATIONS;
type RoleOption = {
    id: RoleOptionId;
    title: string;
    icon: string | null;
    LucideIcon: LucideIcon | null;
};

export function RoleStep({ value, onChange, onNext, onBack }: RoleStepProps) {
    const t = useTranslations("auth");
    const copy = getOnboardingFlowCopy(t);
    const roleOptions: RoleOption[] = copy.role.options.map((option) => {
        const id = option.id as RoleOptionId;
        const decoration = ROLE_DECORATIONS[id];

        return {
            ...decoration,
            ...option,
            id,
        };
    });

    return (
        <div className="space-y-8 w-full">
            <div className="space-y-2">
                <h1 className="text-[28px] font-medium leading-[39px] tracking-[-0.16px] text-white">{copy.role.title}</h1>
                <p className="text-[14px] font-normal leading-[22px] tracking-[-0.16px] text-[#808793]">
                    {copy.role.description}
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex w-full flex-col gap-2">
                    {roleOptions.map((role) => (
                        <div
                            key={role.id}
                            className={cn(
                                "group relative flex h-[46px] w-full cursor-pointer flex-col items-start rounded-[7px] border shadow-[0px_12px_32px_-8px_rgba(34,51,88,0.06)] transition-all",
                                value === role.id
                                    ? "border-[#0A595C] bg-[#022526]"
                                    : "border-[#26282C] bg-transparent hover:border-[#36393F]"
                            )}
                            onClick={() => onChange(role.id)}
                        >
                            <div className={cn(
                                "flex h-[44px] w-full items-center justify-between rounded-[7px]",
                                "bg-transparent"
                            )}>
                                <div className="flex w-full items-center">
                                    {/* Icon Container - Fixed 44x44 */}
                                    <div className={cn(
                                        "flex h-[44px] w-[44px] flex-none items-center justify-center rounded-l-[7px] p-[12px]",
                                        value === role.id ? "bg-[#0BA0A6]" : "bg-[#26282C]"
                                    )}>
                                        {role.icon ? (
                                            <Image
                                                src={role.icon}
                                                alt={role.title}
                                                width={20}
                                                height={20}
                                                className={cn(
                                                    value === role.id ? "brightness-0 invert" : ""
                                                )}
                                            />
                                        ) : role.LucideIcon ? (
                                            <role.LucideIcon
                                                className={cn(
                                                    "h-5 w-5",
                                                    value === role.id ? "text-white" : "text-[#CDD0D5]"
                                                )}
                                            />
                                        ) : null}
                                    </div>

                                    {/* Label Container */}
                                    <div className="flex flex-1 items-center px-2">
                                        <span className={cn(
                                            "font-sans text-[15px] font-medium leading-[24px] tracking-[-0.16px]",
                                            value === role.id ? "text-[#CDD0D5]" : "text-[#CDD0D5]"
                                        )}>
                                            {role.title}
                                        </span>
                                    </div>

                                    {/* Radio Button Container */}
                                    <div className="flex h-[16px] w-[40px] flex-none items-center justify-center px-[12px]">
                                        <div className={cn(
                                            "flex h-[16px] w-[16px] items-center justify-center rounded-full border shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]",
                                            value === role.id
                                                ? "border-white bg-white"
                                                : "border-[#F4F5F6] bg-[rgba(255,255,255,0.002)]"
                                        )}>
                                            {value === role.id && (
                                                <div className="h-[8px] w-[8px] rounded-full bg-[#1E2024]" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex w-full gap-4">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="flex-1 border-[#36393F] bg-transparent text-white hover:bg-white/5"
                        size="lg"
                    >
                        {copy.actions.back}
                    </Button>
                    <Button
                        onClick={onNext}
                        disabled={!value}
                        className="flex-1 bg-white text-black hover:bg-white/90"
                        size="lg"
                    >
                        {copy.actions.continue}
                    </Button>
                </div>
            </div>
        </div>
    );
}
