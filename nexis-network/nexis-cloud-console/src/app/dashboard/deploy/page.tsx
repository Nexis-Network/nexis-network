import Link from "next/link";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { DeployWizardWrapper } from "@/components/deploy/deploy-wizard-wrapper";

type SearchParams = {
  template?: string;
};

export default async function DeployPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link an API key to deploy CVMs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-text-secondary">
          <p>
            Your passkey session is active, but CVM deployments require a Nexis Cloud API key.
          </p>
          <Link
            className={buttonClassName()}
            href="/login?link=api-key&redirect=/dashboard/deploy"
          >
            Link API key
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <DeployWizardWrapper templateSlug={searchParams.template ?? null} />;
}
