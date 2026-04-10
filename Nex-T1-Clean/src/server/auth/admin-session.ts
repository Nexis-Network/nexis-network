import { cookies } from "next/headers"

import { nexFetch } from "@/server/api/nex-client"
import { createCookieBridge, getCookieValue } from "@/server/auth/cookie-bridge"
import type { AdminStatusResponse } from "@/types/admin"

const ADMIN_COOKIE = "nex_admin_token"

export async function getAdminToken(): Promise<string | null> {
  const cookieBridge = createCookieBridge(await cookies())
  return getCookieValue(cookieBridge, ADMIN_COOKIE) ?? null
}

export async function getAdminStatus(): Promise<AdminStatusResponse> {
  const token = await getAdminToken()
  if (!token) {
    return { authenticated: false }
  }

  try {
    const res = await nexFetch("/api/v1/admin/auth/status", {
      method: "GET",
      bearer: token,
    })

    if (!res.ok) {
      return { authenticated: false }
    }

    try {
      const data = (await res.json()) as AdminStatusResponse
      return data
    } catch (error) {
      return { authenticated: false, error: error instanceof Error ? error.message : "status parse failed" }
    }
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : "status request failed",
    }
  }
}

export async function requireAdminToken(): Promise<string> {
  const token = await getAdminToken()
  if (!token) {
    throw new Error("Missing admin token")
  }
  return token
}
