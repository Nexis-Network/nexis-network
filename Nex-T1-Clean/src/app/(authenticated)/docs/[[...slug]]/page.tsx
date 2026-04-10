import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocsPageView } from "@/components/docs/docs-page-view";
import { loadDocsMarkdown } from "@/modules/docs/load-docs-markdown";
import {
  getAdjacentDocsPages,
  getAllDocsStaticParams,
  resolveDocsPageBySlug,
} from "@/modules/docs/pages";

type DocsRoutePageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateStaticParams() {
  return getAllDocsStaticParams();
}

export async function generateMetadata({
  params,
}: DocsRoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolution = resolveDocsPageBySlug(slug ?? []);

  if (resolution.kind === "missing") {
    return {
      title: "Docs | Nex-T1",
    };
  }

  const page = resolution.page;

  return {
    title: `${page.title} | Docs | Nex-T1`,
    description: page.summary,
  };
}

export default async function DocsRoutePage({ params }: DocsRoutePageProps) {
  const { slug } = await params;
  const resolution = resolveDocsPageBySlug(slug ?? []);

  if (resolution.kind === "missing") {
    notFound();
  }

  if (resolution.kind === "alias") {
    redirect(resolution.redirectTo);
  }

  const page = resolution.page;
  const markdownContent = await loadDocsMarkdown(page.markdownPath);
  const { previousPage, nextPage } = getAdjacentDocsPages(page.id);

  return (
    <DocsPageView
      page={page}
      markdownContent={markdownContent}
      previousPage={previousPage}
      nextPage={nextPage}
    />
  );
}
