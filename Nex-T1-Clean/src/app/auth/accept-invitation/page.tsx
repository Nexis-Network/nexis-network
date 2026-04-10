"use client";

import nextDynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useTranslations } from "@/components/providers/locale-provider";

// Skip static prerender — React SSR context unavailable during build

type InvitationFormProps = { token: string; onSuccess?: () => void };

const BasejumpAcceptInvitation = nextDynamic<InvitationFormProps>(async () => {
  try {
    const dynamicImport = new Function("m", "return import(m)") as (
      m: string,
    ) => Promise<Record<string, unknown>>;
    // Try Next.js package first, then React
    const nextMod = await dynamicImport("@usebasejump/next").catch(() => null);
    const reactMod = nextMod ? null : await dynamicImport("@usebasejump/react").catch(() => null);
    const mod = nextMod ?? reactMod;
    if (!mod) return () => null;
    const Form = (mod).AcceptInvitationForm ?? (mod).InvitationForm ?? mod.default ?? null;
    if (!Form) return () => null;
    return (Form as ComponentType<InvitationFormProps>) ?? (() => null);
  } catch {
    return () => null;
  }
}, { ssr: false });

function AcceptInvitationInner() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const token = params?.get("token") ?? params?.get("invitation") ?? "";

  useEffect(() => {
    // If token is missing, bounce to /auth
    if (!token) {
      router.replace("/auth?view=sign-in");
    }
  }, [token, router]);

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-10">
      <h1 className="text-xl font-regular">{t("invitation.title")}</h1>
      {/* If Basejump form is available and flag enabled, render it */}
      <BasejumpAcceptInvitation token={token} onSuccess={() => router.replace("/" )} />
      <noscript>
        <p className="text-sm text-muted-foreground">{t("invitation.enableJavascript")}</p>
      </noscript>
    </main>
  );
}

export default function AcceptInvitationPage() {
  const t = useTranslations("auth");

  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-4 py-10">{t("loading.generic")}</main>}>
      <AcceptInvitationInner />
    </Suspense>
  );
}
