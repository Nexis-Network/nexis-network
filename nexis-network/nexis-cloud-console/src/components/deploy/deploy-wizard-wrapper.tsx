"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DeployWizard = dynamic(
  () => import("./deploy-wizard").then((mod) => mod.DeployWizard),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Loading deploy wizard</CardTitle>
        </CardHeader>
        <CardContent className="text-text-secondary">Preparing deployment tools…</CardContent>
      </Card>
    ),
  },
);

export function DeployWizardWrapper({ templateSlug }: { templateSlug: string | null }) {
  return <DeployWizard templateSlug={templateSlug} />;
}
