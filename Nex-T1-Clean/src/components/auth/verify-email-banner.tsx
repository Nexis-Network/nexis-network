"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useTranslations } from "@/components/providers/locale-provider";
import { useAuthenticate } from "@/components/auth/session-guards";
import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { getVerifyEmailBannerCopy } from "@/modules/auth/i18n";

export function VerifyEmailBanner() {
  const t = useTranslations("auth");
  const copy = getVerifyEmailBannerCopy(t);
  const { user } = useAuthenticate();
  const { supabase } = useSupabaseAuth();
  const [sending, setSending] = useState(false);
  const isEmailVerified = Boolean(user?.email_confirmed_at);

  if (!user || isEmailVerified) return null;
  if (!supabase) return null;

  const onResend = async () => {
    if (!user?.email) return;
    try {
      setSending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) {
        throw error;
      }
      toast.success(copy.success);
    } catch (e: UntypedJson) {
      toast.error(
        e instanceof Error ? e.message : copy.failure,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-md border border-sky-400/20 bg-sky-400/10 text-sky-400 p-3 text-sm flex items-center justify-between backbackdrop-blur-lg">
      <div>
        <strong className="mr-1">{copy.title}</strong>
        {copy.body}
      </div>
      <button
        className="h-8 rounded-md bg-sky-400/10 px-3 text-sky-400 hover:bg-sky-400/20 disabled:opacity-50"
        onClick={onResend}
        disabled={sending}
      >
        {sending ? copy.sending : copy.resend}
      </button>
    </div>
  );
}
