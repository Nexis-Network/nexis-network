import { createWorld } from "@workflow/world-postgres";
import { start, type StartOptions } from "workflow/api";
import { WORKFLOW_POSTGRES_RUNTIME_STATUS } from "./definitions";

import { logger } from "@/lib/logger";

export type WorkflowTriggerRequest<TArgs extends unknown[] = unknown[], TResult = unknown> = {
  workflow:
    | {
        workflowId: string;
      }
    | ((...args: TArgs) => Promise<TResult>);
  args?: TArgs;
  options?: Omit<StartOptions, "world">;
};

export type WorkflowTriggerResult = {
  runId: string;
};

let cachedWorld: ReturnType<typeof createWorld> | null = null;

function getWorkflowWorld(): ReturnType<typeof createWorld> {
  if (cachedWorld) {
    return cachedWorld;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to trigger workflows.");
  }

  cachedWorld = createWorld({ connectionString });
  return cachedWorld;
}

async function trigger<TArgs extends unknown[] = unknown[], TResult = unknown>({
  workflow,
  args,
  options,
}: WorkflowTriggerRequest<TArgs, TResult>): Promise<WorkflowTriggerResult> {
  const resolvedArgs = (args ?? []) as unknown as TArgs;

  logger.debug("workflow_trigger_start", {
    runtimeStatus: WORKFLOW_POSTGRES_RUNTIME_STATUS,
    workflowType: typeof workflow === "function" ? "function" : "metadata",
    argCount: resolvedArgs.length,
  });

  const run = await start(workflow, resolvedArgs, {
    ...options,
    world: getWorkflowWorld(),
  });

  return {
    runId: run.runId,
  };
}

export const workflowClient = {
  trigger,
};
