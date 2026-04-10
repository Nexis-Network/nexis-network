import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { authLogger } from "@/server/logging/logger";
import { getProviderConfig } from "@/lib/auth/config";


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { provider: rawProvider, code, code_verifier } = body;

        const provider = typeof rawProvider === "string"
            ? getProviderConfig(rawProvider)?.id ?? rawProvider.toLowerCase()
            : "";
        const identityToken = typeof body.identity_token === "string"
            ? body.identity_token
            : typeof body.id_token === "string"
            ? body.id_token
            : undefined;
        const useIdTokenGrant = provider === "apple" && !!identityToken;

        if (!code) {
            authLogger.warn("mobile_oauth_exchange_missing_code", { provider });
            return NextResponse.json({ error: "missing_code" }, {
                status: 400,
            });
        }

        const config = getSupabaseConfig();
        if (!config) {
            authLogger.error("mobile_oauth_exchange_supabase_unconfigured", {
                provider,
            });
            return NextResponse.json({ error: "supabase_unconfigured" }, {
                status: 500,
            });
        }

        const grantType = useIdTokenGrant ? "id_token" : "pkce";
        const exchangePayload = useIdTokenGrant
            ? {
                provider: "apple",
                id_token: identityToken,
            }
            : {
                auth_code: code,
                code_verifier: code_verifier ?? "",
            };

        const res = await fetch(
            `${config.url}/auth/v1/token?grant_type=${grantType}`,
            {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: config.anonKey,
            },
            body: JSON.stringify(exchangePayload),
        },
        );

        const data = await res.json();

        if (!res.ok) {
            authLogger.error("mobile_oauth_exchange_failed", {
                provider,
                grantType,
                error: data.error_description || data.msg || "Exchange failed",
                status: res.status,
            });
            return NextResponse.json(
                {
                    error: data.error_description || "Exchange failed",
                    code: data.error,
                },
                { status: res.status },
            );
        }

        authLogger.info("mobile_oauth_exchange_success", {
            provider,
            grantType,
            userId: data.user?.id,
        });

        // Return the session payload exactly as expected
        return NextResponse.json({ data: { session: data, user: data.user } }, {
            status: 200,
        });
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Failed to process mobile oauth exchange";
        authLogger.error("mobile_oauth_exchange_internal_error", {
            error: message,
        });
        return NextResponse.json(
            { error: "internal_error", details: message },
            { status: 500 },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
