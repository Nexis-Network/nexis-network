import { cookies, headers } from "next/headers";
import type { User } from "@supabase/supabase-js";

import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { createCookieBridge } from "@/server/auth/cookie-bridge";

/**
 * Server-safe helper to resolve the currently authenticated user using request cookies or headers.
 * Falls back to null when Supabase is not configured or the session is invalid/expired.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const cookieBridge = createCookieBridge(await cookies());
  const headersList = await headers();

  // Construct a minimal request-like object that allows extractSupabaseAuthState
  // to read the Authorization header, even if not passed explicitly from the route.
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as UntypedJson as Request;

  const session = await getVerifiedSupabaseSession({ 
    cookieBridge,
    request: mockRequest
  });
  
  return session?.user ?? null;
}
