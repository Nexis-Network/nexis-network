"use client";

import { RedirectToSignIn, SignedIn, SignedOut } from "@/components/auth/session-guards";

import { IntegrationsCard } from "@/components/settings/connections/integrations-card";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { SettingsProvidersCard } from "@/components/settings/providers-card";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { useTranslations } from "@/components/providers/locale-provider";
import type { ProfileAggregate } from "@/lib/user/profile";
import { getSettingsConnectionsPageCopy } from "@/modules/settings/i18n";

type ConnectionsPageClientProps = {
  initialProfile?: ProfileAggregate;
};

export function ConnectionsPageClient({ initialProfile }: ConnectionsPageClientProps) {
  const t = useTranslations("settingsNav");
  const copy = getSettingsConnectionsPageCopy(t);
  const { data, isLoading, error } = useProfileAggregate({ initialData: initialProfile });

  return (
    <>
      <SignedIn>
        <SettingsPage className="space-y-6">
          <SettingsPageHeader
            title={copy.title}
            description={copy.description}
          />
          <SettingsProvidersCard />
          {/* LinkedProfilesCard hidden while profile linking is disabled.
              The component is preserved for future Supabase-native linking. */}
          <IntegrationsCard
            integrations={data?.integrations ?? []}
            isLoading={isLoading}
            error={(error as Error | undefined)?.message}
          />
        </SettingsPage>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default ConnectionsPageClient;
