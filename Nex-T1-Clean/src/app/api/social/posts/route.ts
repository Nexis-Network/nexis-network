import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import type { SocialPostKind } from "@/lib/social/types";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { loadSocialPosts } from "@/server/social/queries";


const querySchema = z.object({
  scope: z.enum(["me", "explore", "following", "bookmarks", "shared", "user"]).default("explore"),
  kind: z.enum(["all", "post", "prompt_template", "skill_template"]).default("all"),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

const createSchema = z.object({
  kind: z.enum(["post", "prompt_template", "skill_template"]),
  title: z.string().trim().max(160).nullable().optional(),
  content: z.string().trim().min(1).max(10000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  await connection();
  const supabase = await createClient();
  if (!supabase) {
    return apiResponse.serviceUnavailable("Supabase is not configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiResponse.unauthorized();
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    scope: url.searchParams.get("scope") ?? undefined,
    kind: url.searchParams.get("kind") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  if (parsed.data.scope === "user" && !parsed.data.userId) {
    return apiResponse.badRequest("userId is required when scope is 'user'");
  }

  const pageSize = parsed.data.limit;
  const pageOffset = parsed.data.offset;

  const admin = createServiceRoleClient();
  const pageRows = await loadSocialPosts({
    admin,
    viewerUserId: user.id,
    scope: parsed.data.scope,
    kind: parsed.data.kind,
    limit: pageSize + 1,
    offset: pageOffset,
    targetUserId: parsed.data.userId,
  });

  const hasMore = pageRows.length > pageSize;
  const posts = hasMore ? pageRows.slice(0, pageSize) : pageRows;

  return apiResponse.success({
    posts,
    page: {
      offset: pageOffset,
      limit: pageSize,
      hasMore,
      nextOffset: hasMore ? pageOffset + pageSize : null,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return apiResponse.serviceUnavailable("Supabase is not configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiResponse.unauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const payload = parsed.data;

  const insertPayload = {
    author_id: user.id,
    kind: payload.kind as SocialPostKind,
    title: payload.title?.trim() ? payload.title.trim() : null,
    content: payload.content.trim(),
    metadata: payload.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("social_posts")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    return apiResponse.internalError(error.message);
  }

  const admin = createServiceRoleClient();
  const posts = await loadSocialPosts({
    admin,
    viewerUserId: user.id,
    scope: "me",
    kind: "all",
    limit: 1,
  });

  const createdPost = posts.find((post) => post.id === String(data.id)) ?? posts[0] ?? null;

  return apiResponse.created({ post: createdPost });
}
