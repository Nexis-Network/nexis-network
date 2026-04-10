/**
 * API Route: Agent Settings
 * GET /api/approvals/settings - Get user's agent settings
 * PATCH /api/approvals/settings - Update autonomous mode and risk settings
 */

import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { z } from "zod";
import {
  getAutonomousActionPreferences,
  getUserAgentSettings,
  updateUserAgentSettings,
} from "@/lib/approvals/state-machine";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { requireAal2FromClaims } from "@/server/security/mfa-assurance";

import { logger } from '@/lib/logger';
const AutonomousActionsSchema = z.object({
  bridge: z.boolean().optional(),
  deploy: z.boolean().optional(),
  buy: z.boolean().optional(),
  sell: z.boolean().optional(),
  stake: z.boolean().optional(),
});

const UpdateSchema = z.object({
  autonomousMode: z.boolean().optional(),
  riskTolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  maxTransactionValueUsd: z.string().optional(),
  preferredChains: z.array(z.string()).optional(),
  notificationPreferences: z.record(z.string(), z.unknown()).optional(),
  autonomousActions: AutonomousActionsSchema.optional(),
});

/**
 * GET handler - Retrieve user's agent settings
 */
export async function GET() {
  return withAuthedSupabase(async ({ userId, cookieBridge }) => {
    try {
      const settings = await getUserAgentSettings(userId);
      const autonomousActions = getAutonomousActionPreferences(settings);

      return cookieBridge.commit(apiResponse.success({
        autonomousMode: settings.autonomousMode,
        riskTolerance: settings.riskTolerance,
        maxTransactionValueUsd: settings.maxTransactionValueUsd,
        preferredChains: settings.preferredChains,
        notificationPreferences: settings.notificationPreferences,
        autonomousActions,
      }));
    } catch (error) {
      logger.error("[API] Get settings error:", error);
      return cookieBridge.commit(
        apiResponse.internalError(error instanceof Error ? error.message : "Failed to get settings"),
      );
    }
  });
}

/**
 * PATCH handler - Update user's agent settings
 *
 * SECURITY: Enabling autonomous mode (value-moving operations without manual
 * approval) requires AAL2 (MFA) re-authentication. A stolen session cookie
 * alone is no longer sufficient to escalate to autonomous mode.
 */
export async function PATCH(req: NextRequest) {
  return withAuthedSupabase(async ({ userId, cookieBridge, context }) => {
    try {
      const body = await req.json();
      const validated = UpdateSchema.parse(body);

      const currentSettings = await getUserAgentSettings(userId);

      // SECURITY: Enabling autonomous mode requires AAL2 (MFA) verification.
      // This prevents a stolen session cookie from being used to enable
      // value-moving operations without human-in-the-loop oversight.
      if (validated.autonomousMode === true && !currentSettings.autonomousMode) {
        const aal = requireAal2FromClaims(context.claims);
        if (!aal.ok) {
          return cookieBridge.commit(aal.response);
        }
        logger.warn("[API] User enabled autonomous mode (AAL2 verified):", userId);
      }

      // SECURITY: Enabling individual autonomous actions also requires AAL2
      // when the user is escalating any action from disabled to enabled.
      if (validated.autonomousActions) {
        const currentActions = getAutonomousActionPreferences(currentSettings);
        const isEscalating = Object.entries(validated.autonomousActions).some(
          ([key, value]) => value === true && !currentActions[key as keyof typeof currentActions],
        );

        if (isEscalating) {
          const aal = requireAal2FromClaims(context.claims);
          if (!aal.ok) {
            return cookieBridge.commit(aal.response);
          }
        }
      }

      let mergedPreferences: Record<string, UntypedJson> | undefined;
      if (
        validated.notificationPreferences !== undefined ||
        validated.autonomousActions !== undefined
      ) {
        const base =
          validated.notificationPreferences !== undefined
            ? validated.notificationPreferences
            : (currentSettings.notificationPreferences ?? {});

        const clone: Record<string, UntypedJson> = { ...base };

        if (validated.autonomousActions) {
          const existingActions =
            (clone.autonomous_actions as Record<string, boolean> | undefined) ?? {};
          clone.autonomous_actions = {
            ...existingActions,
            ...Object.fromEntries(
              Object.entries(validated.autonomousActions).map(([key, value]) => [key, Boolean(value)]),
            ),
          };
        }

        mergedPreferences = clone;
      }

      await updateUserAgentSettings(userId, {
        ...(validated.autonomousMode !== undefined ? { autonomousMode: validated.autonomousMode } : {}),
        ...(validated.riskTolerance !== undefined ? { riskTolerance: validated.riskTolerance } : {}),
        ...(validated.maxTransactionValueUsd !== undefined
          ? { maxTransactionValueUsd: validated.maxTransactionValueUsd }
          : {}),
        ...(validated.preferredChains !== undefined ? { preferredChains: validated.preferredChains } : {}),
        ...(mergedPreferences !== undefined ? { notificationPreferences: mergedPreferences } : {}),
      });

      const updated = await getUserAgentSettings(userId);
      const autonomousActions = getAutonomousActionPreferences(updated);

      return cookieBridge.commit(apiResponse.success({
        success: true,
        settings: {
          autonomousMode: updated.autonomousMode,
          riskTolerance: updated.riskTolerance,
          maxTransactionValueUsd: updated.maxTransactionValueUsd,
          preferredChains: updated.preferredChains,
          notificationPreferences: updated.notificationPreferences,
          autonomousActions,
        },
      }));
    } catch (error) {
      logger.error("[API] Update settings error:", error);

      if (error instanceof z.ZodError) {
        return cookieBridge.commit(apiResponse.validationError(error));
      }

      return cookieBridge.commit(
        apiResponse.internalError(error instanceof Error ? error.message : "Failed to update settings"),
      );
    }
  });
}
