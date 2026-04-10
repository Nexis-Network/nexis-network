import { NextResponse } from "next/server";

import { rewardIdentityBodySchema } from "@/app/api/auth/reward-identity/route.schema";
import { recordAuthenticatedRewardIdentity } from "@/app/api/auth/reward-identity/route.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = rewardIdentityBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Invalid reward identity payload.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await recordAuthenticatedRewardIdentity({
      request,
      deviceId: parsed.data.deviceId ?? null,
    });

    if (!result.authenticated) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Authentication required.",
          },
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ data: { recorded: true } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "reward_identity_failed",
          message: error instanceof Error ? error.message : "Failed to record reward identity.",
        },
      },
      { status: 500 },
    );
  }
}
