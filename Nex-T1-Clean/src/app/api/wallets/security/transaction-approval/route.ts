import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  getTransactionApprovalPreference,
  updateTransactionApprovalPreference,
} from "@/server/security/transaction-approval-preferences";


const PatchSchema = z.object({
  enabled: z.boolean(),
  method: z.enum(["biometric", "passkey"]),
  thresholdUsd: z.number().min(0),
});

export async function GET() {
  return withAuthedSupabase(async ({ userId, cookieBridge }) => {
    const preference = await getTransactionApprovalPreference(userId);
    return cookieBridge.commit(
      apiResponse.success({
        ok: true,
        preference,
      }),
    );
  });
}

export async function PATCH(request: Request) {
  return withAuthedSupabase(async ({ userId, cookieBridge }) => {
    const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.validationError(parsed.error));
    }

    const preference = await updateTransactionApprovalPreference(
      userId,
      parsed.data,
    );
    return cookieBridge.commit(
      apiResponse.success({
        ok: true,
        preference,
      }),
    );
  });
}

export const PUT = PATCH;
