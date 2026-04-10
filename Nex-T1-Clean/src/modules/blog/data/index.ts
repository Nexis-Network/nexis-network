import type { Category, Post, PostWithBody } from "@/types/post";
import { cacheLife, cacheTag } from "next/cache";
import metaInfo from "./meta.json" assert { type: "json" };

const PAGE_SIZE = metaInfo.pageSize ?? 8;
const TOTAL_POSTS = metaInfo.total ?? 0;

const pageLoaders: Array<() => Promise<{ default: Post[] }>> = [
  () => import("./pages/page-1.json"),
  () => import("./pages/page-2.json"),
  () => import("./pages/page-3.json"),
  () => import("./pages/page-4.json"),
];

export type BlogPage = {
  posts: Post[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
};

async function loadAllMeta(): Promise<Post[]> {
  "use cache";
  cacheLife("days");
  cacheTag("blog-meta");

  const pages = await Promise.all(pageLoaders.map((loader) => loader().then((m) => m.default)));
  return pages.flat();
}

export async function getBlogPage(page = 1, pageSize = PAGE_SIZE): Promise<BlogPage> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-meta");
  cacheTag(`blog-page:${page}:${pageSize}`);

  const safePage = Math.max(1, page);
  const totalPages = Math.ceil(TOTAL_POSTS / pageSize);

  if (pageSize === PAGE_SIZE && safePage <= pageLoaders.length) {
    const posts = (await pageLoaders[safePage - 1]()).default;
    return { posts, page: safePage, pageSize, totalPages, total: TOTAL_POSTS };
  }

  const all = await loadAllMeta();
  const start = (safePage - 1) * pageSize;
  const posts = all.slice(start, start + pageSize);
  return { posts, page: safePage, pageSize, totalPages: Math.ceil(all.length / pageSize), total: all.length };
}

export async function getAllPostMeta(): Promise<Post[]> {
  "use cache";
  cacheLife("days");
  cacheTag("blog-meta");

  return loadAllMeta();
}

export async function listCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("days");
  cacheTag("blog-categories");
  cacheTag("blog-meta");

  const meta = await loadAllMeta();
  const unique = new Map<string, Category>();
  meta.forEach((post) => {
    if (post.category) {
      unique.set(post.category.slug, {
        slug: post.category.slug,
        title: post.category.title,
      });
    }
  });
  return Array.from(unique.values());
}

export async function getPostBySlug(slug: string): Promise<PostWithBody | null> {
  "use cache";
  cacheLife("days");
  cacheTag("blog-posts");
  cacheTag(`blog-post:${slug}`);

  const { BLOG_POSTS } = await import("./posts");
  return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

export async function getAllPostsWithBody(): Promise<PostWithBody[]> {
  "use cache";
  cacheLife("days");
  cacheTag("blog-posts");

  const { BLOG_POSTS } = await import("./posts");
  return BLOG_POSTS;
}
