import { redirectLegacySettingsPage } from "@/modules/settings/server-redirect";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TradingLegacySettingsPage({ searchParams }: PageProps) {
  await redirectLegacySettingsPage("/settings/trading", searchParams, "/settings/connections?view=exchanges");
}
