import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import {
  INVITE_XP_LEVEL_THRESHOLDS,
  INVITE_XP_PER_SUCCESS,
  resolveInviteLevel,
} from "@/lib/invitations/config";
import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

const CreateInviteSchema = z.object({
  email: z.string().email("A valid email is required"),
});

type ReferralConversionRow = {
  referred_user_id: string;
  referred_email: string | null;
  invite_code: string;
  signed_up_at: string;
  signup_xp_awarded_at: string | null;
  pro_bonus_awarded_at: string | null;
  ultra_bonus_awarded_at: string | null;
  created_at: string;
};

type InviteRow = {
  code: string;
  created_at: string;
  used_at: string | null;
  metadata: Record<string, UntypedJson> | null;
};

type PendingInviteMeta = {
  id: string;
  email: string;
  status: "sent" | "expired";
  sent_at: string;
  expires_at: string;
  accepted_at: string | null;
  code: string;
  xp_awarded: number;
  created_at: string;
};

type InvitationRow = {
  id: string;
  email: string | null;
  status: "signed_up" | "sent" | "expired";
  code: string;
  xpAwarded: number;
  sentAt: string;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
  metadata: Record<string, UntypedJson>;
};

const isDevEnvironment = process.env.NODE_ENV !== "production";
const DEV_INVITE_CODE = "DEV-SANDBOX";
const CANONICAL_APP_URL = "https://nex-t1.ai";

function resolveBaseUrl() {
  return CANONICAL_APP_URL;
}

function safeIso(date: Date) {
  return date.toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

function buildDevInvitationResponse() {
  const now = new Date();
  const chartRangeStart = startOfMonth(subMonths(now, 11));
  const chartBuckets = Array.from({ length: 12 }).map((_, index) => {
    const monthStart = addMonths(chartRangeStart, index);
    return {
      monthLabel: format(monthStart, "MMM yyyy"),
      iso: safeIso(monthStart),
      count: 0,
      xp: 0,
    };
  });

  const levelInfo = resolveInviteLevel(0);

  return {
    code: DEV_INVITE_CODE,
    inviteUrl: `${resolveBaseUrl()}/auth?view=sign-up&invite=${encodeURIComponent(DEV_INVITE_CODE)}`,
    xp: {
      total: 0,
      xpPerSuccess: INVITE_XP_PER_SUCCESS,
      totalSuccesses: 0,
      level: levelInfo.level,
      currentThreshold: levelInfo.currentThreshold,
      nextThreshold: levelInfo.nextThreshold,
      progress: levelInfo.progress,
      thresholds: INVITE_XP_LEVEL_THRESHOLDS,
    },
    codeMetadata: {
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastRegeneratedAt: now.toISOString(),
    },
    chart: {
      series: chartBuckets,
      totalXp: 0,
      totalSuccesses: 0,
      startMonth: safeIso(chartRangeStart),
      endMonth: safeIso(startOfMonth(now)),
    },
    invitations: [] as InvitationRow[],
  };
}

function parsePendingInvites(metadata: Record<string, UntypedJson> | null | undefined): PendingInviteMeta[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = metadata.pending_invites;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((value): value is Record<string, UntypedJson> => Boolean(value) && typeof value === "object" && !Array.isArray(value))
    .map((value): PendingInviteMeta => {
      const status = value.status === "expired" ? "expired" : "sent";
      const sentAt = typeof value.sent_at === "string" ? value.sent_at : nowIso();
      const expiresAt = typeof value.expires_at === "string" ? value.expires_at : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const computedStatus: PendingInviteMeta["status"] =
        status === "expired" || new Date(expiresAt).getTime() <= Date.now() ? "expired" : "sent";

      return {
        id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
        email: typeof value.email === "string" ? value.email : "",
        status: computedStatus,
        sent_at: sentAt,
        expires_at: expiresAt,
        accepted_at: typeof value.accepted_at === "string" ? value.accepted_at : null,
        code: typeof value.code === "string" ? value.code : "",
        xp_awarded: typeof value.xp_awarded === "number" ? value.xp_awarded : 0,
        created_at: typeof value.created_at === "string" ? value.created_at : sentAt,
      };
    })
    .filter((item) => item.email.length > 0);
}

function resolveConversionXp(row: ReferralConversionRow): number {
  let total = 0;
  if (row.signup_xp_awarded_at) total += 500;
  if (row.pro_bonus_awarded_at) total += 750;
  if (row.ultra_bonus_awarded_at) total += 1500;
  return total;
}

function buildChartBuckets(invitations: InvitationRow[]) {
  const now = new Date();
  const chartRangeStart = startOfMonth(subMonths(now, 11));

  const series = Array.from({ length: 12 }).map((_, index) => {
    const monthStart = addMonths(chartRangeStart, index);
    const monthEnd = addMonths(monthStart, 1);

    const rows = invitations.filter((invite) => {
      if (invite.status !== "signed_up" || !invite.acceptedAt) return false;
      const acceptedAt = new Date(invite.acceptedAt);
      return acceptedAt >= monthStart && acceptedAt < monthEnd;
    });

    return {
      monthLabel: format(monthStart, "MMM yyyy"),
      iso: safeIso(monthStart),
      count: rows.length,
      xp: rows.reduce((acc, row) => acc + row.xpAwarded, 0),
    };
  });

  return {
    series,
    totalXp: series.reduce((acc, row) => acc + row.xp, 0),
    totalSuccesses: series.reduce((acc, row) => acc + row.count, 0),
    startMonth: safeIso(chartRangeStart),
    endMonth: safeIso(startOfMonth(now)),
  };
}

function devFallbackJson() {
  return apiResponse.success(buildDevInvitationResponse());
}

async function getAuthenticatedSupabase() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, userId: null };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) {
    return { supabase, userId: null };
  }

  return { supabase, userId: authData.user.id };
}

export async function GET() {
  const { supabase, userId } = await getAuthenticatedSupabase();

  if (!supabase) {
    if (isDevEnvironment) return devFallbackJson();
    return apiResponse.error("CONFIG_ERROR", "supabase_unconfigured", 500);
  }

  if (!userId) {
    return apiResponse.unauthorized("unauthorized");
  }

  const { data: ensuredCode, error: ensuredCodeError } = await supabase.rpc("ensure_user_invite_code_for_supabase");
  if (ensuredCodeError) {
    logger.error("[Invitations] ensure_user_invite_code_for_supabase failed", ensuredCodeError);
    if (isDevEnvironment) return devFallbackJson();
    return apiResponse.internalError("ensure_invite_code_failed");
  }

  const inviteCode = typeof ensuredCode === "string" ? ensuredCode : "";

  const [{ data: inviteRowData, error: inviteRowError }, { data: conversionData, error: conversionError }] = await Promise.all([
    supabase
      .from("invite")
      .select("code,created_at,used_at,metadata")
      .eq("created_by", userId)
      .eq("code", inviteCode)
      .maybeSingle(),
    supabase
      .from("referral_conversions")
      .select(
        "referred_user_id,referred_email,invite_code,signed_up_at,signup_xp_awarded_at,pro_bonus_awarded_at,ultra_bonus_awarded_at,created_at",
      )
      .eq("inviter_user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (inviteRowError) {
    logger.error("[Invitations] invite lookup failed", inviteRowError);
    if (isDevEnvironment) return devFallbackJson();
    return apiResponse.internalError("invite_lookup_failed");
  }

  if (conversionError) {
    logger.error("[Invitations] conversion lookup failed", conversionError);
    if (isDevEnvironment) return devFallbackJson();
    return apiResponse.internalError("conversion_lookup_failed");
  }

  const inviteRow = (inviteRowData ?? null) as InviteRow | null;
  const conversions = (conversionData ?? []) as ReferralConversionRow[];

  const signedUpRows: InvitationRow[] = conversions.map((conversion) => ({
    id: conversion.referred_user_id,
    email: conversion.referred_email,
    status: "signed_up",
    code: conversion.invite_code,
    xpAwarded: resolveConversionXp(conversion),
    sentAt: conversion.created_at,
    acceptedAt: conversion.signed_up_at,
    expiresAt: conversion.signed_up_at,
    createdAt: conversion.created_at,
    metadata: {
      source: "referral_conversions",
    },
  }));

  const pendingRows: InvitationRow[] = parsePendingInvites(inviteRow?.metadata).map((pending) => ({
    id: pending.id,
    email: pending.email,
    status: pending.status,
    code: pending.code || inviteCode,
    xpAwarded: pending.xp_awarded,
    sentAt: pending.sent_at,
    acceptedAt: pending.accepted_at,
    expiresAt: pending.expires_at,
    createdAt: pending.created_at,
    metadata: {
      source: "invite.metadata.pending_invites",
    },
  }));

  const invitations = [...signedUpRows, ...pendingRows].sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    return a.createdAt > b.createdAt ? -1 : 1;
  });

  const totalXp = signedUpRows.reduce((acc, row) => acc + row.xpAwarded, 0);
  const totalSuccesses = signedUpRows.length;
  const levelInfo = resolveInviteLevel(totalXp);

  const chart = buildChartBuckets(invitations);

  return apiResponse.success({
    code: inviteCode,
    inviteUrl: `${resolveBaseUrl()}/auth?view=sign-up&invite=${encodeURIComponent(inviteCode)}`,
    xp: {
      total: totalXp,
      xpPerSuccess: INVITE_XP_PER_SUCCESS,
      totalSuccesses,
      level: levelInfo.level,
      currentThreshold: levelInfo.currentThreshold,
      nextThreshold: levelInfo.nextThreshold,
      progress: levelInfo.progress,
      thresholds: INVITE_XP_LEVEL_THRESHOLDS,
    },
    codeMetadata: {
      createdAt: inviteRow?.created_at ?? null,
      updatedAt: inviteRow?.used_at ?? inviteRow?.created_at ?? null,
      lastRegeneratedAt:
        inviteRow?.metadata && typeof inviteRow.metadata.last_regenerated_at === "string"
          ? inviteRow.metadata.last_regenerated_at
          : inviteRow?.created_at ?? null,
    },
    chart,
    invitations,
  });
}

export async function POST(request: Request) {
  const { supabase, userId } = await getAuthenticatedSupabase();

  if (!supabase) {
    if (isDevEnvironment) return apiResponse.success({ success: true, mock: true });
    return apiResponse.error("CONFIG_ERROR", "supabase_unconfigured", 500);
  }

  if (!userId) {
    return apiResponse.unauthorized("unauthorized");
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const inviteeEmail = parsed.data.email.trim().toLowerCase();

  const { data: ensuredCode, error: ensureError } = await supabase.rpc("ensure_user_invite_code_for_supabase");
  if (ensureError) {
    logger.error("[Invitations] ensure_user_invite_code_for_supabase failed", ensureError);
    return apiResponse.internalError("ensure_invite_code_failed");
  }

  const inviteCode = typeof ensuredCode === "string" ? ensuredCode : "";
  if (!inviteCode) {
    return apiResponse.internalError("invite_code_unavailable");
  }

  const { data: inviteRowData, error: inviteRowError } = await supabase
    .from("invite")
    .select("code,created_at,used_at,metadata")
    .eq("created_by", userId)
    .eq("code", inviteCode)
    .maybeSingle();

  if (inviteRowError) {
    logger.error("[Invitations] invite lookup failed", inviteRowError);
    return apiResponse.internalError("invite_lookup_failed");
  }

  const now = new Date();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const newPendingInvite: PendingInviteMeta = {
    id: crypto.randomUUID(),
    email: inviteeEmail,
    status: "sent",
    sent_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    accepted_at: null,
    code: inviteCode,
    xp_awarded: 0,
    created_at: now.toISOString(),
  };

  const inviteRow = (inviteRowData ?? null) as InviteRow | null;
  const existingPending = parsePendingInvites(inviteRow?.metadata);

  const pendingInvites: PendingInviteMeta[] = [
    newPendingInvite,
    ...existingPending.filter((row) => row.email.toLowerCase() !== inviteeEmail),
  ].slice(0, 200);

  const metadata = {
    ...(inviteRow?.metadata ?? {}),
    pending_invites: pendingInvites,
    last_regenerated_at:
      inviteRow?.metadata && typeof inviteRow.metadata.last_regenerated_at === "string"
        ? inviteRow.metadata.last_regenerated_at
        : now.toISOString(),
  };

  const { error: updateError } = await supabase
    .from("invite")
    .update({ metadata })
    .eq("created_by", userId)
    .eq("code", inviteCode);

  if (updateError) {
    logger.error("[Invitations] invite metadata update failed", updateError);
    return apiResponse.internalError("invite_update_failed");
  }

  return apiResponse.created({ success: true });
}
