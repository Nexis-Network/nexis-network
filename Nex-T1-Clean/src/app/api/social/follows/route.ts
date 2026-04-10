import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { enqueueSocialNotification, loadSocialFollows } from "@/server/social/queries";


const querySchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
});

const writeSchema = z.object({
  targetUserId: z.string().uuid(),
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
    userId: url.searchParams.get("userId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const targetUserId = parsed.data.userId ?? user.id;
  const admin = createServiceRoleClient();

  const follows = await loadSocialFollows({
    admin,
    viewerUserId: user.id,
    targetUserId,
    limit: parsed.data.limit,
  });

  return apiResponse.success(follows);
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

  const parsed = writeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const targetUserId = parsed.data.targetUserId;
  if (targetUserId === user.id) {
    return apiResponse.badRequest("You cannot follow yourself");
  }

  const { data: existingFollow } = await supabase
    .from("social_follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  const { error } = await supabase
    .from("social_follows")
    .insert({
      follower_id: user.id,
      following_id: targetUserId,
    });

  if (error) {
    if (existingFollow || error.code === "23505") {
      return apiResponse.success({ success: true });
    }
    return apiResponse.internalError(error.message);
  }

  if (!existingFollow) {
    const profileUrl = `/settings/profile?userId=${encodeURIComponent(user.id)}`;
    await enqueueSocialNotification({
      admin: createServiceRoleClient(),
      userId: targetUserId,
      actorUserId: user.id,
      title: "New follower",
      body: "Someone started following your profile.",
      url: profileUrl,
      metadata: { type: "social_follow" },
    });
  }

  return apiResponse.success({ success: true });
}

export async function DELETE(request: Request) {
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

  const parsed = writeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const { error } = await supabase
    .from("social_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", parsed.data.targetUserId);

  if (error) {
    return apiResponse.internalError(error.message);
  }

  return apiResponse.success({ success: true });
}
