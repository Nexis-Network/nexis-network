import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/auth/logout-button'
import { buildAuthSignInUrl } from '@/lib/constants'
import { createClient } from '@/server/services/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createClient()
  if (!supabase) {
    redirect(buildAuthSignInUrl({ redirectTo: '/protected' }))
  }

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect(buildAuthSignInUrl({ redirectTo: '/protected' }))
  }

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{data.claims.email}</span>
      </p>
      <LogoutButton />
    </div>
  )
}
