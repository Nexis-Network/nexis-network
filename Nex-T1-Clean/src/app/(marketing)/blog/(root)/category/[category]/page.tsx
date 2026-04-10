import { notFound } from "next/navigation";

import { CategoryBlogListWithPagination } from "@/app/(marketing)/blog/category-blog-list-with-pagination";
import { getRequestI18n } from "@/i18n/server";
import { buildBlogCategoryMetadata } from "@/modules/blog/i18n";
import {
  getAllCategories,
  getCategoryPosts,
  getCategoryPostsCount,
  loadMoreCategoryPosts,
} from "@/modules/blog/actions";
import { BLOG_POSTS } from "@/modules/blog/data/posts";

const PAGE_SIZE = 9;

export async function generateStaticParams() {
  try {
    const categories = await getAllCategories();
    if (categories.length > 0) {
      return categories.map((category) => ({ category: category.slug }));
    }
  } catch {
    // Fall back to local seed content when CMS metadata is unavailable.
  }

  return [
    {
      category: BLOG_POSTS[0]?.category?.slug ?? "feature-release",
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { t } = await getRequestI18n();
  const { category: categorySlug } = await params;
  const categories = await getAllCategories();
  const category = categories.find((entry) => entry.slug === categorySlug);

  if (!category) {
    return { title: t("blog.meta.categoryNotFound") };
  }

  const metadata = buildBlogCategoryMetadata((key, values) => t(`blog.${key}`, values), category.title);

  return {
    title: metadata.title,
    description: metadata.description,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const [posts, totalCount] = await Promise.all([
    getCategoryPosts(category, PAGE_SIZE),
    getCategoryPostsCount(category),
  ]);

  if (!posts || posts.length === 0) {
    notFound();
  }

  const loadMoreAction = loadMoreCategoryPosts.bind(null, category);

  return (
    <CategoryBlogListWithPagination
      initialPosts={posts}
      totalCount={totalCount}
      loadMoreAction={loadMoreAction}
    />
  );
}
