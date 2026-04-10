import Image from "next/image";
import Link from "next/link";
import type { PortableTextComponents } from "@portabletext/react";

import { slugify } from "@/lib/slugify";

export const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({ value }: { value: { asset: { url: string }; alt?: string } }) => (
      <div className="my-8">
        <Image src={value.asset.url} alt={value.alt || ""} width={1200} height={675} className="rounded-lg" />
      </div>
    ),
  },
  block: {
    h1: ({ children, value }) => {
      const text = value?.children?.map((child) => ("text" in child ? child.text : "")).join("") || "";
      const id = slugify(text);
      return (
        <h1 id={id} className="text-foreground mb-4 mt-8 text-4xl font-bold">
          {children}
        </h1>
      );
    },
    h2: ({ children, value }) => {
      const text = value?.children?.map((child) => ("text" in child ? child.text : "")).join("") || "";
      const id = slugify(text);
      return (
        <h2 id={id} className="text-foreground mb-4 mt-16 scroll-mt-20 text-2xl font-regular">
          {children}
        </h2>
      );
    },
    h3: ({ children, value }) => {
      const text = value?.children?.map((child) => ("text" in child ? child.text : "")).join("") || "";
      const id = slugify(text);
      return (
        <h3 id={id} className="text-foreground mb-3 mt-6 scroll-mt-20 text-xl font-regular">
          {children}
        </h3>
      );
    },
    h4: ({ children }) => (
      <h4 className="text-foreground mb-3 mt-6 text-lg font-regular">{children}</h4>
    ),
    normal: ({ children }) => (
      <p className="text-muted-foreground mb-4 text-base leading-relaxed">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-primary my-6 border-l-4 pl-4 italic">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="text-muted-foreground mb-4 ml-6 list-disc space-y-2">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="text-muted-foreground mb-4 ml-6 list-decimal space-y-2">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },
  marks: {
    strong: ({ children }) => (
      <strong className="text-foreground font-regular">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-sm">{children}</code>
    ),
    link: ({ children, value }) => {
      const href = value?.href || "#";
      return (
        <Link href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          {children}
        </Link>
      );
    },
  },
};

