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

  console.log(`Connecting to Supabase at: ${SUPABASE_URL}`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { error } = await supabase.from("users").select("count", { count: "exact", head: true });

    if (error) {
      console.log("Connection Response:", error.message);
      if (error.code === "PGRST301" || error.message.includes('relation "users" does not exist')) {
        console.log("✅ Connection Successful! (API reached, though table might be missing)");
      } else {
        console.error("❌ Connection Failed:", error);
      }
    } else {
      console.log("✅ Connection Successful!");
    }

    const authUrl = `${SUPABASE_URL}/auth/v1/health`;
    try {
      const authRes = await fetch(authUrl);
      const authText = await authRes.text();
      console.log(`Auth Health Check (${authUrl}): ${authRes.status} ${authRes.statusText}`);
      if (authRes.ok) {
        console.log("✅ Auth Service is reachable.");
      } else {
        console.log("⚠️ Auth Service responded with error:", authText);
      }
    } catch (error) {
      console.error("❌ Auth Endpoint Unreachable:", error);
    }
  } catch (error) {
    console.error("❌ Unexpected Error:", error);
  }
};

main().catch((error) => {
  console.error("❌ Supabase connection check failed:", error);
  process.exitCode = 1;
});
