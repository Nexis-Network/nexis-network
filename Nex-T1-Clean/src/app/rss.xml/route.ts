import { getAllPosts } from "@/modules/blog/actions";

export async function GET() {
  const posts = await getAllPosts();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nexis.network";
  const title = "Nex-T1 Blog";
  const description = "Operational intelligence for autonomous crypto teams building with Nexis Network.";

  const items = posts
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      const categories = post.category ? `<category>${post.category.title}</category>` : "";
      const authors = post.authors
        ?.map((author) => `<author>${author.name}</author>`)
        .join("\n        ") ?? "";

      return `
    <item>
        <title><![CDATA[${post.title}]]></title>
        <description><![CDATA[${post.description}]]></description>
        <link>${postUrl}</link>
        <guid isPermaLink="true">${postUrl}</guid>
        <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
        ${categories}
        ${authors}
    </item>`;
    })
    .join("");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>${title}</title>
    <description>${description}</description>
    <link>${siteUrl}/blog</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
</channel>
</rss>`;

  const headers = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
  });

  return new Response(rssFeed, { headers });
}

