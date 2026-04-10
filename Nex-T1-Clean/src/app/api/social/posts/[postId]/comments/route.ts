import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { loadSocialComments } from "@/server/social/queries";


const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(120),
});

export async function GET(
  request: Request,
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

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const admin = createServiceRoleClient();
  const comments = await loadSocialComments({
    admin,
    viewerUserId: user.id,
    postId,
    limit: parsed.data.limit,
  });

  return apiResponse.success({ comments });
}
