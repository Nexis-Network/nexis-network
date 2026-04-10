"use client"

import { Button } from '@/components/ui/button'
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH }))
  }

  return <Button onClick={logout}>Logout</Button>
}
