const LOCAL_BLOG_IMAGES = [
  "/blog/images/blog-1.webp",
  "/blog/images/blog-2.webp",
  "/blog/images/blog-3.webp",
  "/blog/images/blog-4.webp",
  "/blog/images/blog-5.webp",
  "/blog/images/blog-6.jpg",
  "/blog/images/blog-7.jpg",
  "/blog/images/blog-8.jpg",
  "/blog/images/blog-9.jpg",
] as const;

const slugImageCache = new Map<string, string>();
let lastAssignedIndex = -1;

function hasPreferredImage(image?: string | null): image is string {
  if (typeof image !== "string") {
    return false;
  }

  const trimmed = image.trim();

  if (!trimmed) {
    return false;
  }

  return trimmed.startsWith("/");
}

function resolveIndexFromSlug(slug: string): number {
  if (!slug) {
    return (lastAssignedIndex + 1 + LOCAL_BLOG_IMAGES.length) % LOCAL_BLOG_IMAGES.length;
  }

  const hash = Array.from(slug).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Math.abs(hash) % LOCAL_BLOG_IMAGES.length;
}

export function getLocalBlogImage(slug: string, preferredImage?: string | null): string {
  if (hasPreferredImage(preferredImage)) {
    return preferredImage;
  }

  if (slugImageCache.has(slug)) {
    return slugImageCache.get(slug)!;
  }

  let index = resolveIndexFromSlug(slug);

  if (index === lastAssignedIndex) {
    index = (index + 1) % LOCAL_BLOG_IMAGES.length;
  }

  const image = LOCAL_BLOG_IMAGES[index];
  slugImageCache.set(slug, image);
  lastAssignedIndex = index;

  return image;
}

export function __resetLocalBlogImageCache() {
  slugImageCache.clear();
  lastAssignedIndex = -1;
}
