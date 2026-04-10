// Client-safe barrel: keep only browser + config exports to avoid bundling
// server-only modules (which import `next/headers`) into client components.
export { createClient as createBrowserClient, type SupabaseBrowserClient } from './client'
export * from './config'
