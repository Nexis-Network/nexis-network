"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { PlugZap } from "@/components/animate-ui/icons/plug-zap";
import { toast } from "sonner";
import { Button } from "@/components/settings/shared/settings-button";
import { cn } from "@/lib/utils";
import type { SupabaseOAuthProviderId } from "@/lib/supabase/providers";
import { SettingsCard } from "@/components/settings/shared/settings-card";
import { useTranslations } from "@/components/providers/locale-provider";
import { useAuthProviders } from "@/hooks/auth/use-auth-providers";
import { getOAuthProviderLabel } from "@/modules/auth/i18n";
import { getSettingsProvidersCardCopy } from "@/modules/settings/i18n";

import { useMemo, useState } from "react";
type OAuthProvider = {
  id: SupabaseOAuthProviderId;
};

const FALLBACK_PROVIDERS: OAuthProvider[] = [
  { id: "google" },
  { id: "github" },
  { id: "x" },
  { id: "discord" },
  { id: "apple" },
];

const PROVIDER_ICON_SRC: Record<SupabaseOAuthProviderId, string | null> = {
  google: "/assets/sources-icons/google.svg",
  github: "/assets/social-icons/github-light.svg",
  x: "/assets/sources-icons/X-Twitter.svg",
  discord: "/assets/sources-icons/discord.svg",
  apple: "/assets/sources-icons/apple.svg",
};

export function SettingsProvidersCard() {
  const authT = useTranslations("auth");
  const settingsT = useTranslations("settingsNav");
  const copy = useMemo(() => getSettingsProvidersCardCopy(settingsT), [settingsT]);
  const { data: providers, isFetched: providersResolved } = useAuthProviders();
  const [loading, setLoading] = useState(false);

  const available = useMemo(() => {
    if (!providersResolved || !providers) {
      return [];
    }

    return FALLBACK_PROVIDERS
      .filter((provider) => providers.has(provider.id))
      .map((provider) => ({
        ...provider,
        label: getOAuthProviderLabel(authT, provider.id),
      }));
  }, [authT, providers, providersResolved]);

  const handleConnect = async (providerId: SupabaseOAuthProviderId) => {
    setLoading(true);
    try {
      const providerSlug = providers?.get(providerId) ?? providerId;
      const params = new URLSearchParams();
      params.set("redirectTo", "/settings/connections");
      const target = `/api/auth/oauth/${encodeURIComponent(providerSlug)}/start?${params.toString()}`;
      window.location.assign(target);
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : copy.oauthStartFailed);
    }
  };

  return (
    <SettingsCard
      title={copy.title}
      description={copy.description}
      icon={<PlugZap className="size-4" animateOnHover />}
    >
      {!providersResolved ? null : available.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
          <PlugZap className="h-4 w-4" animateOnHover />
          {copy.empty}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {available.map((provider) => (
            <Button
              key={provider.id}
              variant="outline"
              className={cn(
                "justify-center border border-[var(--bento-border)] bg-white/[0.03] text-[var(--bento-text-primary)]",
                "hover:bg-white/5",
              )}
              disabled={loading}
              onClick={() => handleConnect(provider.id)}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {PROVIDER_ICON_SRC[provider.id] ? (
                <Image
                  src={PROVIDER_ICON_SRC[provider.id] as string}
                  alt=""
                  width={16}
                  height={16}
                  className="mr-2 h-4 w-4 shrink-0"
                />
              ) : null}
              {provider.label}
            </Button>
          ))}
        </div>
      )}
    </SettingsCard>
  );
}
