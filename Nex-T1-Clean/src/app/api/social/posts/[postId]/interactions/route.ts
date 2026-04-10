import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { enqueueSocialNotification } from "@/server/social/queries";


const createActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("like") }),
  z.object({ action: z.literal("bookmark") }),
  z.object({ action: z.literal("share") }),
  z.object({ action: z.literal("comment"), content: z.string().trim().min(1).max(2000) }),
]);

const deleteActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("like") }),
  z.object({ action: z.literal("bookmark") }),
  z.object({ action: z.literal("share") }),
  z.object({ action: z.literal("comment"), commentId: z.string().uuid() }),
]);

async function getPostAuthorId(postId: string) {
  const admin = createServiceRoleClient();
  const { data: postRow } = await admin
    .from("social_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!postRow) {
    return { postExists: false, authorId: null as string | null };
  }

  return {
    postExists: true,
    authorId: String(postRow.author_id),
  };
}

function buildPostFocusUrl(postId: string, commentId?: string) {
  const query = new URLSearchParams({
    focusPostId: postId,
  });

  if (commentId) {
    query.set("focusCommentId", commentId);
  }

  return `/settings/profile?${query.toString()}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params;
  if (!postId) {
    return apiResponse.badRequest("Post id is required");
  }

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

  const parsed = createActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const { postExists, authorId } = await getPostAuthorId(postId);
  if (!postExists) {
    return apiResponse.notFound("Post not found");
  }

  if (parsed.data.action === "like") {
    const { data: existingLike } = await supabase
      .from("social_post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("social_post_likes")
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    if (error) {
      if (existingLike || error.code === "23505") {
        return apiResponse.success({ success: true });
      }
      return apiResponse.internalError(error.message);
    }

    if (!existingLike) {
      await enqueueSocialNotification({
        admin: createServiceRoleClient(),
        userId: authorId ?? "",
        actorUserId: user.id,
        title: "New like",
        body: "Someone liked your post.",
        url: buildPostFocusUrl(postId),
        metadata: { postId, type: "social_like" },
      });
    }

    return apiResponse.success({ success: true });
  }

  if (parsed.data.action === "bookmark") {
    const { error } = await supabase
      .from("social_post_bookmarks")
      .upsert(
        {
          post_id: postId,
          user_id: user.id,
        },
        { onConflict: "post_id,user_id", ignoreDuplicates: true },
      );

    if (error) {
      return apiResponse.internalError(error.message);
    }

    return apiResponse.success({ success: true });
  }

  if (parsed.data.action === "share") {
    const { data: existingShare } = await supabase
      .from("social_post_shares")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("social_post_shares")
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    if (error) {
      if (existingShare || error.code === "23505") {
        return apiResponse.success({ success: true });
      }
      return apiResponse.internalError(error.message);
    }

    if (!existingShare) {
      await enqueueSocialNotification({
        admin: createServiceRoleClient(),
        userId: authorId ?? "",
        actorUserId: user.id,
        title: "Post shared",
        body: "Someone shared your post.",
        url: buildPostFocusUrl(postId),
        metadata: { postId, type: "social_share" },
      });
    }

    return apiResponse.success({ success: true });
  }

  const { data: createdComment, error } = await supabase
    .from("social_post_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      content: parsed.data.content,
    })
    .select("id")
    .single();

  if (error) {
    return apiResponse.internalError(error.message);
  }

  const createdCommentId = createdComment?.id ? String(createdComment.id) : undefined;

  await enqueueSocialNotification({
    admin: createServiceRoleClient(),
    userId: authorId ?? "",
    actorUserId: user.id,
    title: "New comment",
    body: "Someone commented on your post.",
    url: buildPostFocusUrl(postId, createdCommentId),
    metadata: { postId, commentId: createdCommentId, type: "social_comment" },
  });

  return apiResponse.success({ success: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params;
  if (!postId) {
    return apiResponse.badRequest("Post id is required");
  }

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

  const parsed = deleteActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  if (parsed.data.action === "like") {
    const { error } = await supabase
      .from("social_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      return apiResponse.internalError(error.message);
    }

    return apiResponse.success({ success: true });
  }

  if (parsed.data.action === "bookmark") {
    const { error } = await supabase
      .from("social_post_bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      return apiResponse.internalError(error.message);
    }

    return apiResponse.success({ success: true });
  }

  if (parsed.data.action === "share") {
    const { error } = await supabase
      .from("social_post_shares")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      return apiResponse.internalError(error.message);
    }

    return apiResponse.success({ success: true });
  }

  const { error } = await supabase
    .from("social_post_comments")
    .delete()
    .eq("id", parsed.data.commentId)
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) {
    return apiResponse.internalError(error.message);
  }

  return apiResponse.success({ success: true });
}
