import { connection } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getTaskForUser, updateTaskDefinitionForUser } from "@/server/tasks/repository";
import { createClient } from "@/server/services/supabase/server";
import { TaskScheduleSchema } from "@/modules/tasks";
import { NotificationChannelSchema, TaskActionSchema } from "@/modules/tasks/action-schema";


import { logger } from '@/lib/logger';
const TaskUpdateSchema = z
  .object({
    title: z.string().min(3).optional(),
    description: z.string().nullable().optional(),
    agent: z.string().nullable().optional(),
    team: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    schedule: TaskScheduleSchema.optional(),
    action: TaskActionSchema.optional(),
    notificationChannels: z.array(NotificationChannelSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      Object.keys(value).some((key) => value[key as keyof typeof value] !== undefined),
    "Provide at least one field to update",
  );


type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(request: Request, routeContext: RouteContext) {
  await connection();
  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const { context: auth } = await resolveSupabaseContext(bridge, { request });
    if (!auth) {
      return bridge.commit(apiResponse.unauthorized("Sign in required"));
    }

    const { taskId } = await routeContext.params;
    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }
    const task = await getTaskForUser(auth.userId, taskId, supabase);
    if (!task) {
      return bridge.commit(apiResponse.notFound("Not found"));
    }

    return bridge.commit(apiResponse.success({ task }));
  } catch (error) {
    return bridge.commit(
      apiResponse.error("TASK_LOAD_ERROR", error instanceof Error ? error.message : "Unable to load task", 502),
    );
  }
}

export async function PATCH(request: Request, routeContext: RouteContext) {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);

  try {
    const { context: auth } = await resolveSupabaseContext(bridge, { request });
    if (!auth) {
      return bridge.commit(apiResponse.unauthorized("Sign in required"));
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return bridge.commit(apiResponse.badRequest("Update payload required"));
    }

    const parsed = TaskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return bridge.commit(
        apiResponse.badRequest(
          `Invalid payload: ${JSON.stringify(parsed.error.flatten())}`
        ),
      );
    }

    const { taskId } = await routeContext.params;
    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client not available");
    }
    const updated = await updateTaskDefinitionForUser(auth.userId, taskId, parsed.data, supabase);
    return bridge.commit(apiResponse.success({ task: updated }));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("tasks_update_error", error);
    }
    return bridge.commit(
      apiResponse.error("TASK_UPDATE_ERROR", error instanceof Error ? error.message : "Unable to update task", 502),
    );
  }
}
