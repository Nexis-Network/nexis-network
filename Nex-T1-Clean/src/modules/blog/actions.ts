'use server';

import { client, urlFor, sanityConfigured } from "@/lib/sanity/client";
import { BLOG_POSTS } from "@/modules/blog/data/posts";
import type { Post, PostWithBody } from "@/types/post";
import { groq } from "next-sanity";

// Note: sanityConfigured check moved to individual functions to avoid build-time errors

// Helper to map Sanity document to Post type (defensive against missing fields)
const mapSanityPost = (post: UntypedJson): Post | null => {
  if (!post || !post.slug?.current || !post.title) return null;

  const publishedAt = post.publishedAt ?? new Date().toISOString();
  const category = Array.isArray(post.categories) && post.categories.length > 0
    ? post.categories[0]
    : null;

  return {
    title: post.title ?? "Untitled",
    description: post.description ?? "",
    slug: post.slug.current,
    href: post.slug.current,
    publishedAt,
    date: new Date(publishedAt).toISOString().split("T")[0],
    image: post.mainImage ? urlFor(post.mainImage).url() : "",
    category: category && category.slug?.current
      ? { title: category.title ?? "Uncategorized", slug: category.slug.current }
      : { title: "Uncategorized", slug: "uncategorized" },
    authors: post.author
      ? [{
          name: post.author.name ?? "Unknown author",
          image: post.author.image ? urlFor(post.author.image).url() : "",
        }]
      : [],
  };
};

const mapSanityPostWithBody = (post: UntypedJson): PostWithBody | null => {
  const base = mapSanityPost(post);
  if (!base) return null;
  return {
    ...base,
    body: post.body ?? [],
  };
};

export async function loadMorePosts(offset: number, limit = 9): Promise<Post[]> {
  if (!sanityConfigured) {
    return BLOG_POSTS.slice(offset, offset + limit);
  }
  const query = groq`*[_type == "post"] | order(publishedAt desc) [$offset...$end] {
    ...,
    author->,
    categories[]->
  }`;
  const posts = await client.fetch(query, { offset, end: offset + limit });
  return (posts ?? []).map(mapSanityPost).filter(Boolean) as Post[];
}

export async function loadMoreCategoryPosts(
  category: string,
  offset: number,
  limit = 9,
): Promise<Post[]> {
  if (!sanityConfigured) {
    return BLOG_POSTS
      .filter((post) => post.category.slug === category)
      .slice(offset, offset + limit);
  }
  const query = groq`*[_type == "post" && $category in categories[]->slug.current] | order(publishedAt desc) [$offset...$end] {
    ...,
    author->,
    categories[]->
  }`;
  const posts = await client.fetch(query, { category, offset, end: offset + limit });
  return (posts ?? []).map(mapSanityPost).filter(Boolean) as Post[];
}

export async function getPostBySlug(slug: string): Promise<PostWithBody | null> {
  if (!sanityConfigured) {
    return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
  }
  const query = groq`*[_type == "post" && slug.current == $slug][0] {
    ...,
    author->,
    categories[]->
  }`;
  const post = await client.fetch(query, { slug });
  const mapped = post ? mapSanityPostWithBody(post) : null;
  return mapped;
}

export async function getAllPostSlugs(): Promise<{ slug: string }[]> {
  if (!sanityConfigured) {
    return BLOG_POSTS.map((post) => ({ slug: post.slug }));
  }
  const query = groq`*[_type == "post"] { "slug": slug.current }`;
  return (await client.fetch(query)) ?? [];
}

export async function getInitialPosts(limit = 9): Promise<Post[]> {
  return loadMorePosts(0, limit);
}

export async function getTotalPostsCount(): Promise<number> {
  if (!sanityConfigured) {
    return BLOG_POSTS.length;
  }
  return (await client.fetch(groq`count(*[_type == "post"])`)) ?? 0;
}

export async function getCategoryPosts(category: string, limit = 9): Promise<Post[]> {
  return loadMoreCategoryPosts(category, 0, limit);
}

export async function getCategoryPostsCount(category: string): Promise<number> {
  if (!sanityConfigured) {
    return BLOG_POSTS.filter((post) => post.category.slug === category).length;
  }
  return (await client.fetch(groq`count(*[_type == "post" && $category in categories[]->slug.current])`, { category })) ?? 0;
}

export async function getAllPosts(): Promise<Post[]> {
  if (!sanityConfigured) {
    return BLOG_POSTS;
  }
  const query = groq`*[_type == "post"] | order(publishedAt desc) {
    ...,
    author->,
    categories[]->
  }`;
  const posts = await client.fetch(query);
  return (posts ?? []).map(mapSanityPost).filter(Boolean) as Post[];
}

export async function getAllCategories(): Promise<{ title: string; slug: string }[]> {
  if (!sanityConfigured) {
    const categories = new Map<string, { title: string; slug: string }>();
    BLOG_POSTS.forEach((post) => {
      if (post.category) {
        categories.set(post.category.slug, post.category);
      }
    });
    return Array.from(categories.values());
  }
  const query = groq`*[_type == "category"] { title, "slug": slug.current }`;
  return (await client.fetch(query)) ?? [];
}
