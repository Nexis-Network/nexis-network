"use client";

import { useTranslations } from "@/components/providers/locale-provider";
import { ProfileAccountSummary } from "@/components/settings/profile/profile-account-summary";
import { ProfileAlertsCard } from "@/components/settings/profile/profile-alerts-card";
import { ProfileAvatarCard } from "@/components/settings/profile/profile-avatar-card";
import { ProfileContactCard } from "@/components/settings/profile/profile-contact-card";
import { ProfileIconPreferenceCard } from "@/components/settings/profile/profile-icon-preference-card";
import { ProfileIdentityForm } from "@/components/settings/profile/profile-identity-form";
import { ProfilePushNotificationsCard } from "@/components/settings/profile/profile-push-notifications-card";
import { ProfileSessionControlsCard } from "@/components/settings/profile/profile-session-controls-card";
import { ProfileSessionsCard } from "@/components/settings/profile/profile-sessions-card";
import { ProfileThemePreferenceCard } from "@/components/settings/profile/profile-theme-preference-card";
import { SettingsProvidersCard } from "@/components/settings/providers-card";
import {
  SettingsMainColumn,
  SettingsPage,
  SettingsPageBody,
  SettingsPageHeader,
  SettingsSideColumn,
} from "@/components/settings-v2/primitives/page";
import { SessionListCard } from "@/components/settings/security/session-list";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import type { ProfileAggregate } from "@/lib/user/profile";
import AccountDetailsContent from "@/components/settings/account/account-details-content";

type ProfileWorkspaceProps = {
  data?: ProfileAggregate;
  isLoading: boolean;
};

type SettingsProfileSectionProps = {
  activeView?: string;
};

export function SettingsProfileSection({
  activeView = "identity",
}: SettingsProfileSectionProps) {
  const { data, isLoading } = useProfileAggregate();

  if (activeView === "icons") {
    return <ProfileIconsView data={data} isLoading={isLoading} />;
  }

  if (activeView === "alerts") {
    return <ProfileAlertsView data={data} isLoading={isLoading} />;
  }

  if (activeView === "sessions") {
    return <ProfileSessionsView data={data} isLoading={isLoading} />;
  }

  if (activeView === "identity") {
    return <ProfileIdentityView data={data} isLoading={isLoading} />;
  }

  return <AccountDetailsContent />;
}

function ProfileIdentityView({ data, isLoading }: ProfileWorkspaceProps) {
  const t = useTranslations("profile");

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title={t("settingsIdentityTitle")}
        description={t("settingsIdentityDescription")}
      />

      <SettingsPageBody>
        <SettingsMainColumn>
          <ProfileIdentityForm
            identity={data?.identity}
            isLoading={isLoading}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <ProfileContactCard
              identity={data?.identity}
              isLoading={isLoading}
            />
            <ProfileAvatarCard
              identity={data?.identity}
              isLoading={isLoading}
            />
          </div>

          <div className="w-full">
            <ProfileIconPreferenceCard
              identity={data?.identity}
              isLoading={isLoading}
            />
          </div>

          <div className="w-full">
            <ProfileThemePreferenceCard />
          </div>
        </SettingsMainColumn>

        <SettingsSideColumn>
          <ProfileAccountSummary data={data} isLoading={isLoading} />
        </SettingsSideColumn>
      </SettingsPageBody>
    </SettingsPage>
  );
}

function ProfileIconsView({ data, isLoading }: ProfileWorkspaceProps) {
  const t = useTranslations("profile");

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title={t("settingsVisualsTitle")}
        description={t("settingsVisualsDescription")}
      />

      <SettingsPageBody>
        <SettingsMainColumn>
          <ProfileIconPreferenceCard
            identity={data?.identity}
            isLoading={isLoading}
          />
          <ProfileAvatarCard identity={data?.identity} isLoading={isLoading} />
        </SettingsMainColumn>

        <SettingsSideColumn>
          <ProfileAccountSummary data={data} isLoading={isLoading} />
          <ProfileContactCard identity={data?.identity} isLoading={isLoading} />
        </SettingsSideColumn>
      </SettingsPageBody>
    </SettingsPage>
  );
}

function ProfileAlertsView({ data, isLoading }: ProfileWorkspaceProps) {
  const t = useTranslations("profile");

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title={t("settingsAlertsTitle")}
        description={t("settingsAlertsDescription")}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <ProfileAlertsCard alerts={data?.alerts} isLoading={isLoading} />
        <ProfilePushNotificationsCard />
        <SettingsProvidersCard />
      </div>
    </SettingsPage>
  );
}

function ProfileSessionsView({ data, isLoading }: ProfileWorkspaceProps) {
  const t = useTranslations("profile");

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title={t("settingsSessionsTitle")}
        description={t("settingsSessionsDescription")}
      />

      <SettingsPageBody>
        <SettingsMainColumn>
          <SessionListCard />
        </SettingsMainColumn>

        <SettingsSideColumn>
          <ProfileSessionControlsCard
            identity={data?.identity}
            isLoading={isLoading}
          />
          <ProfileSessionsCard
            sessions={data?.sessions}
            isLoading={isLoading}
          />
          <ProfileAccountSummary data={data} isLoading={isLoading} />
        </SettingsSideColumn>
      </SettingsPageBody>
    </SettingsPage>
  );
}
