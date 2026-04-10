import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let supabaseSingleton = null;

function loadEnvOnce() {
  if (process.env.__SOLANA_WALLET_ENV_LOADED) return;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  config({ path: join(__dirname, '..', '.env.local') });
  config({ path: join(__dirname, '..', '.env') });
  process.env.__SOLANA_WALLET_ENV_LOADED = 'true';
}

export function getSupabaseServiceClient() {
  if (supabaseSingleton) return supabaseSingleton;

  loadEnvOnce();
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
    process.exit(1);
  }

  supabaseSingleton = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return supabaseSingleton;
}
