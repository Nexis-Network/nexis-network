import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/lib/supabase/config'


import { logger } from '@/lib/logger';
/**
 * If using Fluid compute: don't put this client in a global variable.
 * Always create a new client within each request scope when using it.
 */
export async function createClient() {
  const config = getSupabaseConfig()
  if (!config) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Supabase server client requested but environment variables are missing')
    }
    return null
  }

  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null
  try {
    cookieStore = await cookies()
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      throw error
    }
  }

  return createServerClient(config.url, config.anonKey, {
    auth: {
      flowType: 'pkce',
    },
    cookies: {
      getAll() {
        return cookieStore?.getAll() ?? []
      },
      setAll(cookiesToSet) {
        try {
          if (!cookieStore) return
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore?.set(name, value, options as CookieOptions)
          })
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

export type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createClient>>>
