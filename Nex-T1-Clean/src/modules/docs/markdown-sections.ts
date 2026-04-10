import type { DocsPageSection } from "@/modules/docs/types";

export type ParsedDocsMarkdown = {
  intro: string;
  sections: Array<{
    id: string;
    title: string;
    body: string;
  }>;
};

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveSectionId(title: string, fallbackSections: DocsPageSection[]) {
  const exact = fallbackSections.find((section) => section.title === title);

  if (exact) {
    return exact.id;
  }

  return slugifyHeading(title);
}

export function parseDocsMarkdownSections(
  content: string,
  fallbackSections: DocsPageSection[],
): ParsedDocsMarkdown {
  const headingPattern = /^##\s+(.+)$/gm;
  const matches = Array.from(content.matchAll(headingPattern));

  if (matches.length === 0) {
    return { intro: content.trim(), sections: [] };
  }

  const intro = content.slice(0, matches[0].index ?? 0).trim();
  const sections = matches.map((match, index) => {
    const title = match[1].trim();
    const headingStart = match.index ?? 0;
    const bodyStart = headingStart + match[0].length;
    const nextHeadingStart = matches[index + 1]?.index ?? content.length;
    const body = content.slice(bodyStart, nextHeadingStart).trim();

    return {
      id: resolveSectionId(title, fallbackSections),
      title,
      body,
    };
  });

  return { intro, sections };
}
