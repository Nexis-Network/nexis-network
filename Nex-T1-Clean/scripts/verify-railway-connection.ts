import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_OR_ANON_KEY?.trim() ??
  process.env.SUPABASE_ANON_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
  "";

const main = async () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_OR_ANON_KEY (or SUPABASE_ANON_KEY)."
    );
  }

  console.log(`Verifying Supabase connection: ${SUPABASE_URL}`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { error } = await supabase.from("users").select("count", { count: "exact", head: true });

    if (error) {
      if (error.code === "PGRST301" || error.message.includes('relation "users" does not exist')) {
        console.log("✅ API Connection: Success (table check skipped)");
      } else {
        console.error("❌ API Connection Failed:", error);
      }
    } else {
      console.log("✅ API Connection: Success!");
    }

    const authUrl = `${SUPABASE_URL}/auth/v1/health`;
    try {
      const authRes = await fetch(authUrl);
      console.log(`Auth Health Check: ${authRes.status} ${authRes.statusText}`);
      if (authRes.ok || authRes.status === 401) {
        console.log("✅ Auth Service: Reachable & Healthy");
      } else {
        console.log("⚠️ Auth Service Warning:", await authRes.text());
      }
    } catch (error) {
      console.error("❌ Auth Connection Error:", error);
    }
  } catch (error) {
    console.error("❌ Unexpected Error:", error);
  }
};

main().catch((error) => {
  console.error("❌ Failed to verify Supabase connection:", error);
  process.exitCode = 1;
});
