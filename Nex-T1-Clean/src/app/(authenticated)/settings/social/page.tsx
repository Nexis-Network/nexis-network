import { redirectLegacySettingsPage } from "@/modules/settings/server-redirect";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SocialLegacySettingsPage({ searchParams }: PageProps) {
  await redirectLegacySettingsPage("/settings/social", searchParams, "/settings/profile?view=public");
}
