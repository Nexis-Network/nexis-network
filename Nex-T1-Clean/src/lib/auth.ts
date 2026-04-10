import { auth } from "@trigger.dev/sdk/v3";
import { cookies } from "next/headers";

import { captureHandledException, runWithSentrySpan } from "@/lib/observability/sentry";
import { createCookieBridge, getCookieValue } from "@/server/auth/cookie-bridge";


import { logger } from '@/lib/logger';
// Helper function to generate a public access token for a specific run
export async function generatePublicAccessToken(
  runId: string
): Promise<string> {
  return runWithSentrySpan(
    {
      name: "trigger.public-access-token.generate",
      op: "auth.token",
      captureException: false,
      attributes: {
        "trigger.run.id": runId,
      },
      tags: {
        token: "public-access",
      },
    },
    async () => {
      try {
        const token = await auth.createPublicToken({
          scopes: {
            read: {
              runs: [runId],
            },
          },
          expirationTime: "15m",
        });
        return token;
      } catch (error) {
        captureHandledException(error, {
          tags: { token: "public-access" },
          extra: { runId },
        });
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to generate public access token",
        );
      }
    },
  );
}

// Helper function to get the public access token from cookies
export async function getPublicAccessToken(): Promise<string | undefined> {
  const cookieBridge = createCookieBridge(await cookies());
  return getCookieValue(cookieBridge, "publicAccessToken");
}

// Helper function to create cookie options
function createCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 15 * 60, // 15 minutes in seconds
    path: "/",
  };
}

// Helper function to create a response with the public access token cookie
export function createResponseWithToken(token: string): Response {
  const response = new Response();
  response.headers.set(
    "Set-Cookie",
    `publicAccessToken=${token}; ${Object.entries(createCookieOptions())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ")}`
  );
  return response;
}

// Helper function to clear the public access token cookie
export async function clearPublicAccessToken(): Promise<Response> {
  const cookieBridge = createCookieBridge(await cookies());
  const options = {
    ...createCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  } as const;

  cookieBridge.setAll([
    {
      name: "publicAccessToken",
      value: "",
      options,
    },
  ]);

  return cookieBridge.commit(new Response(null, { status: 204 }));
}

// Generate a public access token for listing runs
export async function generateListPublicAccessToken() {
  return runWithSentrySpan(
    {
      name: "trigger.public-access-token.list",
      op: "auth.token",
      captureException: false,
      tags: { token: "public-access" },
      attributes: {
        "trigger.job.id": "story-chain-task",
      },
    },
    async () => {
      try {
        return await auth.createPublicToken({
          scopes: {
            read: {
              tasks: ["story-chain-task"],
            },
          },
          expirationTime: "15m",
        });
      } catch (error) {
        captureHandledException(error, {
          tags: { token: "public-access" },
          extra: { context: "list" },
        });
        throw error;
      }
    },
  );
}

// Generate a task token for creating tasks
export async function generateTaskToken() {
  return runWithSentrySpan(
    {
      name: "trigger.task-token.generate",
      op: "auth.token",
      captureException: false,
      tags: { token: "task" },
      attributes: {
        "trigger.job.id": "story-chain-task",
      },
    },
    async () => {
      try {
        logger.debug("Auth: Generating task token with scopes:", [
          "story-chain-task",
        ]);
        const token = await auth.createTriggerPublicToken(["story-chain-task"], {
          expirationTime: "1h",
          multipleUse: true,
        });
        logger.debug("Auth: Task token generated successfully");
        return token;
      } catch (error) {
        logger.error("Auth: Error generating task token:", error);
        captureHandledException(error, {
          tags: { token: "task" },
          extra: { scope: "story-chain-task" },
        });
        throw error;
      }
    },
  );
}
