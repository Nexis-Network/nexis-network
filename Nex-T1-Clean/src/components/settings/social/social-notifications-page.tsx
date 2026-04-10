"use client";

import { SocialNotificationsList } from "@/components/settings/social/social-notifications-list";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";

export function SocialNotificationsPage() {
  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Notifications"
        description="Track social activity, follows, comments, likes, shares, and system updates."
      />

      <SocialNotificationsList />
    </SettingsPage>
  );
}
