import Constants from 'expo-constants';
import { z } from 'zod';

/**
 * Environment variable schema — validated at startup.
 * All external access goes through this module.
 * No other module should read process.env or Constants directly.
 */
const envSchema = z.object({
  // API
  API_BASE_URL: z.string().url(),
  MOBILE_API_BASE_URL: z.string().url().optional(),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),

  // WalletConnect
  WALLETCONNECT_PROJECT_ID: z.string().min(1),

  // Feature flags
  ENVIRONMENT: z.enum(['development', 'preview', 'production']).default('development'),
  DEV_AUTH_BYPASS: z.boolean().default(false),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),

  // OAuth Client IDs (public)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),

  // Crossmint (optional — empty string fallback so the app boots without them)
  CROSSMINT_CLIENT_KEY: z.string().default(''),
  CROSSMINT_PROJECT_ID: z.string().default(''),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const extra = Constants.expoConfig?.extra ?? {};
  const raw = {
    API_BASE_URL: extra.apiBaseUrl ?? process.env['EXPO_PUBLIC_API_BASE_URL'] ?? '',
    MOBILE_API_BASE_URL: extra.mobileApiBaseUrl ?? process.env['EXPO_PUBLIC_MOBILE_API_BASE_URL'],
    SUPABASE_URL: extra.supabaseUrl ?? process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '',
    SUPABASE_ANON_KEY: extra.supabaseAnonKey ?? process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '',
    WALLETCONNECT_PROJECT_ID: extra.walletConnectProjectId ?? process.env['EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID'] ?? '',
    ENVIRONMENT: extra.environment ?? process.env['EXPO_PUBLIC_ENVIRONMENT'] ?? 'development',
    DEV_AUTH_BYPASS: extra.devAuthBypass === 'true' || process.env['EXPO_PUBLIC_DEV_AUTH_BYPASS'] === 'true',
    SENTRY_DSN: extra.sentryDsn ?? process.env['EXPO_PUBLIC_SENTRY_DSN'],
    GOOGLE_CLIENT_ID: extra.googleClientId ?? process.env['EXPO_PUBLIC_GOOGLE_CLIENT_ID'],
    GITHUB_CLIENT_ID: extra.githubClientId ?? process.env['EXPO_PUBLIC_GITHUB_CLIENT_ID'],
    DISCORD_CLIENT_ID: extra.discordClientId ?? process.env['EXPO_PUBLIC_DISCORD_CLIENT_ID'],
    TWITTER_CLIENT_ID: extra.twitterClientId ?? process.env['EXPO_PUBLIC_TWITTER_CLIENT_ID'],
    CROSSMINT_CLIENT_KEY: extra.crossmintClientKey ?? process.env['EXPO_PUBLIC_CROSSMINT_CLIENT_KEY'] ?? '',
    CROSSMINT_PROJECT_ID: extra.crossmintProjectId ?? process.env['CROSSMINT_PROJECT_ID'] ?? '',
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const missing = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`[ENV_VALIDATION_FAILED] Missing or invalid environment variables:\n${missing}`);
  }

  return result.data;
}

let _env: Env | undefined;

export function getEnv(): Env {
  if (!_env) {
    _env = loadEnv();
  }
  return _env;
}

export function isProduction(): boolean {
  return getEnv().ENVIRONMENT === 'production';
}

export function isDevelopment(): boolean {
  return getEnv().ENVIRONMENT === 'development';
}
