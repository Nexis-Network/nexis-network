import { redirectLegacySettingsPage } from "@/modules/settings/server-redirect";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AILegacySettingsPage({ searchParams }: PageProps) {
  await redirectLegacySettingsPage("/settings/ai", searchParams, "/settings/agents");
}
