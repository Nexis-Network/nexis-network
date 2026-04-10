import { type NextRequest } from "next/server";

import {
  resolveAuthenticatedSupabaseUser,
  toUnauthorizedJsonResponse,
} from "@/server/api/helpers/auth-guard";
import type { SupabaseServerClient } from "@/server/services/supabase/server";

type Ok = {
  ok: true;
  supabase: SupabaseServerClient;
  userId: string;
};

type Err = { ok: false; response: Response };

export async function requireSupabaseUser(_req?: NextRequest): Promise<Ok | Err> {
  const auth = await resolveAuthenticatedSupabaseUser(_req);
  if (!auth.ok) {
    return { ok: false, response: toUnauthorizedJsonResponse(auth) };
  }

  return { ok: true, supabase: auth.auth.supabase, userId: auth.auth.userId };
}
