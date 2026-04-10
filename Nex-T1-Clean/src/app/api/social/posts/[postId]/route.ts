import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { loadSocialPostById } from "@/server/social/queries";


export async function GET(
  _request: Request,
  context: { params: Promise<{ postId: string }> },
) {
  await connection();
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

  const admin = createServiceRoleClient();
  const post = await loadSocialPostById({
    admin,
    viewerUserId: user.id,
    postId,
  });

  if (!post) {
    return apiResponse.notFound("Post not found");
  }

  return apiResponse.success({ post });
}

export async function DELETE(
  _request: Request,
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

  const { error } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) {
    return apiResponse.internalError(error.message);
  }

  return apiResponse.success({ success: true });
}
