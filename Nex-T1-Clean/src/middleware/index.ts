// Note: config is NOT re-exported here - it must be defined directly in middleware.ts
// for Next.js static analysis at build time
export { proxy as middleware } from "@/proxy-handler";
export {
  SUPABASE_SESSION_REFRESH_CACHE_COOKIE,
  SUPABASE_SESSION_REFRESH_THRESHOLD_SECONDS,
  shouldRefreshSupabaseSession,
} from "@/lib/middleware/session-refresh";
