import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { AuthApiError, type User } from '@supabase/supabase-js'


import { logger } from '@/lib/logger';
export type SessionUpdateResult = {
  supabase: ReturnType<typeof createServerClient> | null
  response: NextResponse
  user: User | null
  mutations: { name: string; value: string; options?: UntypedJson }[]
}

export type UpdateSessionOptions = {
  /**
   * If a user was already verified (e.g., via JWKS), pass it here to skip
   * the redundant getUser() call. The session sync will still happen to
   * refresh cookies, but we won't hit the auth API again.
   */
  preVerifiedUser?: User | null
  /**
   * Skip the getUser() call entirely. Use when you only need to sync cookies
   * and don't need fresh user data.
   */
  skipUserVerification?: boolean
}

/**
 * Update the Supabase session, refreshing cookies as needed.
 * 
 * This function has been optimized to avoid redundant API calls:
 * - If `preVerifiedUser` is provided, we use it instead of calling getUser()
 * - If `skipUserVerification` is true, we skip the getUser() call entirely
 * 
 * @param request - The incoming Next.js request
 * @param options - Optional configuration to optimize API calls
 */
export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {}
): Promise<SessionUpdateResult> {
  let response = NextResponse.next({ request })

  type CookieMutation = {
    name: string
    value: string
    options?: Parameters<typeof response.cookies.set>[2]
  }

  const mutations: CookieMutation[] = []

  const config = getSupabaseConfig()
  if (!config) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Supabase middleware invoked without environment configuration')
    }
    return { supabase: null, response, user: null, mutations }
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    auth: {
      flowType: 'pkce',
    },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        const deduped = new Map<string, CookieMutation>()

        mutations.forEach((mutation) => {
          deduped.set(mutation.name, mutation)
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          deduped.set(name, { name, value, options })
        })

        response = NextResponse.next({ request })
        deduped.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
        mutations.splice(0, mutations.length, ...deduped.values())
      },
    },
  })

  // If user was already verified, use that to avoid redundant API call
  if (options.preVerifiedUser !== undefined) {
    return { supabase, response, user: options.preVerifiedUser, mutations }
  }

  // If caller explicitly wants to skip verification
  if (options.skipUserVerification) {
    return { supabase, response, user: null, mutations }
  }

  // Do not run code between createServerClient and the auth call.
  let user: User | null = null

  try {
    const { data, error } = await supabase.auth.getUser()

    // Handle expected auth errors (expired/revoked tokens, missing sessions)
    if (error) {
      // Check if this is any Supabase auth error (AuthApiError, AuthSessionMissingError, etc.)
      const isAuthError = error instanceof AuthApiError ||
        (error && typeof error === 'object' && '__isAuthError' in error)

      if (isAuthError) {
        // Expected errors: session_expired, refresh_token_not_found, invalid_refresh_token, missing session
        const errorCode = (error).code
        const errorStatus = (error).status
        const errorName = (error).name || error.constructor?.name

        const isExpectedError =
          errorCode === 'session_expired' ||
          errorCode === 'refresh_token_not_found' ||
          errorCode === 'invalid_refresh_token' ||
          errorName === 'AuthSessionMissingError' ||
          (errorStatus === 400 && (errorCode === undefined || errorCode === null))

        if (isExpectedError) {
          // Clear auth cookies silently - this is a normal flow when sessions expire or are missing
          // The SSR library will handle cookie cleanup via setAll callback
          user = null
        } else {
          // Log unexpected auth errors only in development
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('[middleware] Unexpected auth error:', {
              name: errorName,
              code: errorCode,
              status: errorStatus,
              message: (error).message,
            })
          }
          user = null
        }
      } else {
        // Non-auth errors should be logged
        if (process.env.NODE_ENV !== 'production') {
          logger.error('[middleware] Unexpected error in getUser:', error)
        }
        user = null
      }
    } else {
      user = data?.user ?? null
    }
  } catch (error) {
    // Catch any unexpected throws
    if (process.env.NODE_ENV !== 'production') {
      logger.error('[middleware] Exception in auth.getUser():', error)
    }
    user = null
  }

  return { supabase, response, user, mutations }
}
