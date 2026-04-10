import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  // Use the service role key to bypass RLS for inserting nonces.
  return createClient(url, serviceRoleKey);
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Supabase server configuration is incomplete" },
        { status: 500 },
      );
    }

    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    // Generate a pure random nonce
    const nonce = randomBytes(16).toString("hex");

    // Insert or update nonce in Supabase
    const { error } = await supabaseAdmin
      .from("wallet_nonces")
      .upsert(
        { 
          wallet_address: walletAddress.toLowerCase(), 
          nonce, 
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
        },
        { onConflict: "wallet_address" }
      );

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: "Failed to store nonce" }, { status: 500 });
    }

    const statement = "Sign this message to authenticate with Nex-T1 Enterprise.";
    const message = `nex-t1.com wants you to sign in with your Ethereum account:\n${walletAddress}\n\n${statement}\n\nNonce: ${nonce}`;

    return NextResponse.json({ nonce, message });
  } catch (err) {
    console.error("Nonce API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
