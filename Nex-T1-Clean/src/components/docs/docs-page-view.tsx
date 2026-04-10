import Link from "next/link";

import { DocsMarkdown } from "@/components/docs/docs-markdown";
import { DocsPageEnhancement } from "@/components/docs/docs-page-enhancement";
import { DocsSection } from "@/components/docs/docs-primitives";
import { DocsSurface } from "@/components/docs/docs-surface";
import { parseDocsMarkdownSections } from "@/modules/docs/markdown-sections";
import type { DocsPageRecord } from "@/modules/docs/types";

export function DocsPageView({
  page,
  markdownContent,
  previousPage,
  nextPage,
}: {
  page: DocsPageRecord;
  markdownContent: string;
  previousPage: DocsPageRecord | null;
  nextPage: DocsPageRecord | null;
}) {
  const { intro, sections } = parseDocsMarkdownSections(markdownContent, page.sections);
  const enhancementPlacement = page.enhancementPlacement ?? "after-sections";
  const enhancement = page.enhancement ? <DocsPageEnhancement enhancement={page.enhancement} /> : null;

  return (
    <div className="flex w-full max-w-none flex-col gap-10 px-4 pb-12 pt-5 sm:px-5 sm:pb-14 sm:pt-6 md:px-8 lg:gap-12 lg:px-10 lg:pb-16 lg:pt-10 xl:px-12 2xl:px-14">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Docs</span>
          <span className="size-1 rounded-full bg-muted-foreground/60" />
          <span>Updated {page.lastUpdated}</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2rem] md:text-[2.35rem]">
            {page.title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{page.summary}</p>
        </div>
        {page.sections.length > 0 ? (
          <nav className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border/60 pb-3 text-[13px] leading-6 text-muted-foreground sm:text-sm">
            {page.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="transition-colors hover:text-foreground">
                {section.title}
              </a>
            ))}
          </nav>
        ) : null}
      </header>

      <div className="space-y-10 md:space-y-12">
        {intro ? (
          page.id === "example-prompts" ? (
            <DocsSurface
              overlayAsset="horizon-grid"
              overlayClassName="opacity-60"
              overlayStyle={{
                backgroundPosition: "center top",
                backgroundSize: "130% auto",
              }}
              contentClassName="px-5 py-4 sm:px-6"
            >
              <DocsMarkdown content={intro} />
            </DocsSurface>
          ) : (
            <div className="max-w-4xl">
              <DocsMarkdown content={intro} />
            </div>
          )
        ) : null}
        {enhancementPlacement === "after-intro" ? enhancement : null}
        {sections.map((section) => (
          <DocsSection key={section.id} id={section.id} title={section.title}>
            <DocsMarkdown content={section.body} />
          </DocsSection>
        ))}
        {enhancementPlacement === "after-sections" ? enhancement : null}
      </div>

      <nav className="grid gap-3 border-t border-border/60 pt-6 sm:grid-cols-2">
        {previousPage ? (
          <Link
            href={previousPage.href}
            className="rounded-lg border border-border/60 px-4 py-4 text-sm transition-colors hover:border-border hover:text-foreground"
          >
            <p className="text-xs text-muted-foreground">Previous</p>
            <p className="mt-2 font-medium text-foreground">{previousPage.title}</p>
          </Link>
        ) : (
          <div />
        )}
        {nextPage ? (
          <Link
            href={nextPage.href}
            className="rounded-lg border border-border/60 px-4 py-4 text-sm transition-colors hover:border-border hover:text-foreground md:text-right"
          >
            <p className="text-xs text-muted-foreground">Next</p>
            <p className="mt-2 font-medium text-foreground">{nextPage.title}</p>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
