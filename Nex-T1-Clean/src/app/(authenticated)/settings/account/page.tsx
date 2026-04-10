import { redirectLegacySettingsPage } from "@/modules/settings/server-redirect";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountLegacySettingsPage({ searchParams }: PageProps) {
  await redirectLegacySettingsPage("/settings/account", searchParams, "/settings/profile?view=identity");
}
