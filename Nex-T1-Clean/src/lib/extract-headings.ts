import type { PortableTextBlock } from "@portabletext/types";

import { slugify } from "@/lib/slugify";

export type ExtractedHeading = {
  text: string;
  level: number;
  slug: string;
};

export function extractHeadings(blocks: PortableTextBlock[] = []): ExtractedHeading[] {
  return blocks
    .filter((block): block is PortableTextBlock & { style?: string; children?: Array<{ text?: string }> } =>
      Boolean(block && block._type === "block" && Array.isArray(block.children))
    )
    .filter((block) => {
      const style = block.style ?? "";
      return style === "h2" || style === "h3" || style === "h4";
    })
    .map((block) => {
      const text = block.children?.map((child) => child.text ?? "").join("")?.trim() ?? "";
      const level = Number((block.style ?? "").replace("h", "")) || 2;
      return {
        text,
        level,
        slug: slugify(text),
      } satisfies ExtractedHeading;
    })
    .filter((heading) => heading.text.length > 0);
}
