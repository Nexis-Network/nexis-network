"use client";

import { useMemo, useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useTranslations } from "@/components/providers/locale-provider";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

// Skip static prerender — React SSR context unavailable during build

import { Suspense } from "react";

function ResetPasswordContent() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);



  const token =
    params?.get("token_hash") ??
    params?.get("token") ??
    params?.get("code") ??
    null;
  const tokenKey = params?.has("token_hash") ? "token_hash" : "token";

  const type = params?.get("type") ?? "recovery";

  const [formError, formAction, isPending] = useActionState(
    async (prevState: string | null, formData: FormData) => {
      const password = formData.get("password") as string;
      const confirm = formData.get("confirm") as string;

      if (!supabase) {
         return t("toasts.supabaseNotConfigured");
      }
      if (!token) {
        return t("toasts.missingRecoveryToken");
      }
      if (password.length < 8) {
        return t("toasts.passwordMinLength");
      }
      if (password !== confirm) {
        return t("toasts.passwordsDoNotMatch");
      }

      try {
        const { error: verifyError } = await supabase.auth.verifyOtp(
          tokenKey === "token_hash"
            ? { token_hash: token, type: type as "recovery" }
            : { token, type: type as "recovery" }
        );
        if (verifyError) throw verifyError;

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;

        toast.success(t("toasts.passwordUpdated"));
        router.replace("/auth?view=sign-in");
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : t("toasts.passwordUpdateFailed");
      }
    },
    null
  );

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">{t("reset.title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t("reset.description")}
      </p>

      <form action={formAction} className="space-y-4">
        {formError && <div className="text-sm font-medium text-destructive">{formError}</div>}
        <div className="space-y-2">
          <Label htmlFor="password">{t("reset.newPassword")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">{t("reset.confirmPassword")}</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={isPending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? t("reset.updating") : t("reset.updatePassword")}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations("auth");

  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center">{t("loading.generic")}</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
