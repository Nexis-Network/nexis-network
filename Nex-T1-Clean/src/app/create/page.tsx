import { CreateBuilderPage } from "@/modules/create/components/create-builder-page";
import {
  getCreateCapabilities,
  getCreateTemplateCatalog,
} from "@/modules/create/template-catalog";

export default async function CreatePage() {
  const [templates, capabilities] = await Promise.all([
    getCreateTemplateCatalog(),
    getCreateCapabilities(),
  ]);

  return (
    <CreateBuilderPage
      capabilities={capabilities}
      templates={templates}
    />
  );
}
