"use client";

import { ChevronLeft, ArrowRight, Mail } from "lucide-react";
import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ForgotPasswordStepProps = {
    email: string;
    loading: boolean;
    onBack: () => void;
    onSubmit: () => void;
    onEmailChange: (value: string) => void;
};

export function ForgotPasswordStep({
    email,
    loading,
    onBack,
    onSubmit,
    onEmailChange,
}: ForgotPasswordStepProps) {
    const t = useTranslations("auth");

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
                <h2 className="text-xl font-regular">{t("forgot.title")}</h2>
                <span className="h-8 w-8 opacity-0" />
            </div>

            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    {t("forgot.description")}
                </p>

                <form
                    className="space-y-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <Input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => onEmailChange(event.target.value)}
                        placeholder={t("forgot.emailPlaceholder")}
                        className="h-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground"
                        disabled={loading}
                        required
                    />

                    <Button
                        type="submit"
                        className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={loading || !email}
                    >
                        <span className="flex items-center justify-center gap-2">
                            {loading ? (
                                <ArrowRight className="h-4 w-4 animate-pulse" />
                            ) : (
                                <Mail className="h-4 w-4" />
                            )}
                            <span>{loading ? t("forgot.sendingLink") : t("forgot.sendResetLink")}</span>
                        </span>
                    </Button>
                </form>
            </div>
        </div>
    );
}
