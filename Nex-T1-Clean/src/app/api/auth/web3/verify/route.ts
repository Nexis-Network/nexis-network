import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage } from "viem";
import { SignJWT } from "jose";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey);
}

function getJwtSecret() {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    return null;
  }
  return new TextEncoder().encode(jwtSecret);
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const jwtSecret = getJwtSecret();
    if (!supabaseAdmin || !jwtSecret) {
      return NextResponse.json(
        { error: "Supabase server configuration is incomplete" },
        { status: 500 },
      );
    }

    const { walletAddress, signature, message } = await req.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch nonce from db to ensure it's valid and not expired
    const { data: nonceRecord, error: nonceError } = await supabaseAdmin
      .from("wallet_nonces")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single();

    if (nonceError || !nonceRecord) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    if (new Date(nonceRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "Nonce expired" }, { status: 401 });
    }

    // 2. Verify signature validity
    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    // 3. Clear the nonce so it can't be reused
    await supabaseAdmin
      .from("wallet_nonces")
      .delete()
      .eq("wallet_address", walletAddress.toLowerCase());

    // 4. Map or Create Supabase User
    let { data: userMapping } = await supabaseAdmin
      .from("users_web3")
      .select("id")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single();

    let userId = userMapping?.id;

    if (!userId) {
      // Create a deterministic auth.users record
      const fakeEmail = `${walletAddress.toLowerCase()}@web3.nex-t1.com`;
      const { data: newAuthUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        user_metadata: { wallet_address: walletAddress.toLowerCase() }
      });

      if (authErr || !newAuthUser.user) {
        return NextResponse.json({ error: "Provisioning user failed" }, { status: 500 });
      }
      
      userId = newAuthUser.user.id;

      // Link mapping
      await supabaseAdmin.from("users_web3").insert({
        id: userId,
        wallet_address: walletAddress.toLowerCase(),
      });
    }

    // 5. Mint custom JWT for Supabase RLS
    // Role MUST be 'authenticated' to pass RLS
    const jwt = await new SignJWT({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      wallet_address: walletAddress.toLowerCase()
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1w") // 1 week session
      .sign(jwtSecret);

    return NextResponse.json({ token: jwt, user_id: userId, wallet: walletAddress });

  } catch (err) {
    console.error("Verify API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
