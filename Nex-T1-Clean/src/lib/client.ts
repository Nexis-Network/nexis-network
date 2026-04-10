'use server';

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_BLOCKS_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_BLOCKS_SUPABASE_URL");
}
if (!process.env.BLOCKS_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env.BLOCKS_SUPABASE_SERVICE_ROLE_KEY");
}

if (typeof window !== "undefined") {
  throw new Error("supabaseAdminClient must not be imported in the browser bundle.");
}

// Likely don't want to do this in production, we use the admin client to create documents and tasks.
// Using admin here is just to get around forcing users to authenticate before using the preview
export const supabaseAdminClient = createClient(
  process.env.NEXT_PUBLIC_BLOCKS_SUPABASE_URL,
  process.env.BLOCKS_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);
