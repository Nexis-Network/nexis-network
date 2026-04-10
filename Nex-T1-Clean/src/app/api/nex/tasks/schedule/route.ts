import { cookies } from "next/headers";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createClient } from "@/server/services/supabase/server";
import { invalidateUserTasksCache } from "@/server/tasks/cache";
import { scheduleTaskForUser } from "@/server/tasks/repository";
import { NotificationChannelSchema, TaskActionSchema } from "@/modules/tasks/action-schema";
import { TaskScheduleSchema } from "@/modules/tasks";
import { taskScheduleRateLimit, checkRateLimit } from "@/server/security/rate-limit";


import { logger } from '@/lib/logger';
const TaskPayloadSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  agent: z.string().optional(),
  team: z.string().optional(),
  kind: z.string().optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  action: TaskActionSchema,
  notificationChannels: z.array(NotificationChannelSchema).default(["in_app"]),
});

const ScheduleTaskSchema = z.object({
  task: TaskPayloadSchema,
  schedule: TaskScheduleSchema,
});


export async function POST(request: Request) {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(bridge, { request });
    if (!context) {
      return bridge.commit(apiResponse.unauthorized("Sign in required"));
    }

    // Rate limit: 10 task creations per user per hour
    const rl = await checkRateLimit(context.userId, taskScheduleRateLimit);
    if (!rl.success) {
      return bridge.commit(
        new Response(JSON.stringify({ error: "RATE_LIMITED", message: "Too many tasks created. Limit: 10 per hour." }), {
          status: 429,
          headers: { "Content-Type": "application/json", ...rl.headers },
        }),
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return bridge.commit(apiResponse.badRequest("task payload required"));
    }

    const parsed = ScheduleTaskSchema.safeParse(body);
    if (!parsed.success) {
      return bridge.commit(
        apiResponse.badRequest(
          `Invalid schedule payload: ${JSON.stringify(parsed.error.flatten())}`
        ),
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }
    const created = await scheduleTaskForUser(context.userId, parsed.data, supabase);
    await invalidateUserTasksCache(context.userId);

    return bridge.commit(
      apiResponse.success({
          ok: true,
          createdTaskIds: [created.id],
      }),
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("tasks_schedule_error", error);
    }
    return bridge.commit(
      apiResponse.error("SCHEDULE_TASK_ERROR", error instanceof Error ? error.message : "Unable to schedule task", 502),
    );
  }
}
