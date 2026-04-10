import { PRIMARY_DOCS_PAGES } from "@/modules/docs/page-definitions-primary";
import { SECONDARY_DOCS_PAGES } from "@/modules/docs/page-definitions-secondary";

export const DOCS_PAGES = [...PRIMARY_DOCS_PAGES, ...SECONDARY_DOCS_PAGES];

function matchesSlug(pageSlug: string[], candidateSlug: string[]) {
  if (pageSlug.length !== candidateSlug.length) {
    return false;
  }

  return pageSlug.every((segment, index) => segment === candidateSlug[index]);
}

type DocsPageResolution =
  | { kind: "page"; page: (typeof DOCS_PAGES)[number] }
  | { kind: "alias"; page: (typeof DOCS_PAGES)[number]; redirectTo: string }
  | { kind: "missing" };

export function getAllDocsStaticParams() {
  return DOCS_PAGES.map((page) => (page.slug.length > 0 ? { slug: page.slug } : {}));
}

export function resolveDocsPageBySlug(slug: string[]): DocsPageResolution {
  const direct = DOCS_PAGES.find((page) => matchesSlug(page.slug, slug));

  if (direct) {
    return { kind: "page", page: direct };
  }

  const aliased = DOCS_PAGES.find((page) =>
    (page.aliases ?? []).some((alias) => matchesSlug(alias, slug)),
  );

  if (aliased) {
    return {
      kind: "alias",
      page: aliased,
      redirectTo: aliased.href,
    };
  }

  return { kind: "missing" };
}

export function getAdjacentDocsPages(pageId: string) {
  const index = DOCS_PAGES.findIndex((page) => page.id === pageId);

  return {
    previousPage: index > 0 ? DOCS_PAGES[index - 1] : null,
    nextPage: index >= 0 && index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : null,
  };
}
