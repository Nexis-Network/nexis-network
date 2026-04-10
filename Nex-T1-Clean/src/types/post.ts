import type { PortableTextBlock } from "@portabletext/types";

export interface Author {
  name: string;
  image: string;
}

export interface Post {
  title: string;
  description: string;
  slug: string;
  href: string;
  publishedAt: string;
  date: string;
  image: string;
  category: {
    title: string;
    slug: string;
  };
  authors: Author[];
}

export interface PostWithBody extends Post {
  body: PortableTextBlock[];
}

export interface Heading {
  text: string;
  level: number;
  slug: string;
}

export type Category = {
  slug: string;
  title: string;
};

