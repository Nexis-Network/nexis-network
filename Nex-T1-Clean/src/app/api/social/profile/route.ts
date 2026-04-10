import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { loadSocialProfile } from "@/server/social/queries";


const updateSchema = z
  .object({
    bio: z.string().trim().max(280).nullable().optional(),
    bannerUrl: z.string().trim().url().nullable().optional(),
  })
  .strict();

function emptySocialProfile(userId: string) {
  return {
    id: userId,
    displayName: null,
    username: null,
    avatarUrl: null,
    bannerUrl: null,
    bio: null,
    stats: {
      posts: 0,
      prompts: 0,
      skills: 0,
      followers: 0,
      following: 0,
      bookmarks: 0,
    },
    viewer: {
      isOwnProfile: true,
      isFollowing: false,
    },
  };
}

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
  const requestedUserId = url.searchParams.get("userId")?.trim();
  const targetUserId = requestedUserId || user.id;

  let socialClient = supabase;
  try {
    socialClient = createServiceRoleClient();
  } catch {
    // In local/dev, service-role env may be absent. Fall back to request-scoped client.
  }

  let profile: Awaited<ReturnType<typeof loadSocialProfile>> = null;
  try {
    profile = await loadSocialProfile({
      admin: socialClient,
      viewerUserId: user.id,
      targetUserId,
    });
  } catch (error) {
    if (targetUserId === user.id) {
      return apiResponse.success(emptySocialProfile(user.id));
    }
    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to load profile");
  }

  if (!profile) {
    if (targetUserId === user.id) {
      return apiResponse.success(emptySocialProfile(user.id));
    }
    return apiResponse.notFound("Profile not found");
  }

  return apiResponse.success(profile);
}

export async function PATCH(request: Request) {
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

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const updatePayload: Record<string, UntypedJson> = {};

  if (parsed.data.bio !== undefined) {
    updatePayload.bio = parsed.data.bio;
  }
  if (parsed.data.bannerUrl !== undefined) {
    updatePayload.banner_url = parsed.data.bannerUrl;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiResponse.badRequest("No changes provided");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", user.id)
    .maybeSingle();

  const metadataRecord =
    currentProfile?.metadata && typeof currentProfile.metadata === "object" && !Array.isArray(currentProfile.metadata)
      ? ({ ...currentProfile.metadata } as Record<string, UntypedJson>)
      : {};

  if (parsed.data.bannerUrl !== undefined) {
    metadataRecord.bannerUrl = parsed.data.bannerUrl;
  }

  updatePayload.metadata = metadataRecord;

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      ...updatePayload,
    });

  if (error) {
    return apiResponse.internalError(error.message);
  }

  let socialClient = supabase;
  try {
    socialClient = createServiceRoleClient();
  } catch {
    // In local/dev, service-role env may be absent. Fall back to request-scoped client.
  }

  let refreshed: Awaited<ReturnType<typeof loadSocialProfile>> = null;
  try {
    refreshed = await loadSocialProfile({
      admin: socialClient,
      viewerUserId: user.id,
      targetUserId: user.id,
    });
  } catch {
    refreshed = null;
  }

  return apiResponse.success(refreshed ?? emptySocialProfile(user.id));
}
