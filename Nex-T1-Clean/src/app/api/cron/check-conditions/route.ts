import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { evaluateTaskConditions } from "@/server/tasks/conditions";
import { runTaskNowForUser } from "@/server/tasks/repository";

import { logger } from '@/lib/logger';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cron.check-conditions", async () => {
    const secret = process.env.CRON_SECRET ?? "";
    const authHeader = request.headers.get("authorization");

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return apiResponse.unauthorized("Unauthorized");
    }
    try {
        const supabase = getSupabaseAdminClient();

        // 1. Fetch all active conditional tasks
        // We look for tasks with status 'set' and schedule_type 'conditional'
        const { data: tasks, error } = await supabase
            .from("agent_tasks")
            .select("*, task_conditions(*)")
            .eq("status", "set")
            .not("condition_digest", "is", null); // Optimization: only fetch if conditions exist

        if (error) {
            throw new Error(`Failed to fetch tasks: ${error.message}`);
        }

        if (!tasks || tasks.length === 0) {
            return apiResponse.success({ processed: 0 });
        }

        logger.debug(`[Cron] Evaluating conditions for ${tasks.length} tasks`);

        let triggeredCount = 0;

        // 2. Evaluate conditions for each task
        for (const task of tasks) {
            // Skip if no conditions defined (shouldn't happen due to query, but safe check)
            if (!task.task_conditions || task.task_conditions.length === 0) {
                continue;
            }

            const evaluation = await evaluateTaskConditions(task.task_conditions);

            if (evaluation.passed) {
                logger.debug(`[Cron] Task ${task.id} conditions met. Triggering...`);
                await runTaskNowForUser(task.user_id, task.id, supabase);
                triggeredCount++;
            }
        }

        return apiResponse.success({
            processed: tasks.length,
            triggered: triggeredCount
        });

    } catch (error) {
        if (error instanceof Error) {
           logger.error("[Cron] Error evaluating conditions:", { error: error.message, stack: error.stack });
        } else {
           logger.error("[Cron] Error evaluating conditions:", { error });
        }
        return apiResponse.internalError("Internal server error");
    }
  });
}
