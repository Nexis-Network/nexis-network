import { nanoid } from "nanoid";
import type { JSONSchema7 } from "json-schema";

import {
  arrayProp,
  createTool,
  createToolSchema,
  enumProp,
  objectProp,
  stringProp,
  type ToolExecutionContext,
} from "./create-tool";
import {
  clearWorkingMemoryState,
  computeWorkflowMetrics,
  readWorkingMemoryState,
  resolveWorkingMemoryScope,
  summarizeWorkingMemoryState,
  writeWorkingMemoryState,
  type TodoStatus,
  type WorkingMemoryState,
  type WorkingTodo,
} from "@/modules/chat/state/working-memory-store";

type WorkingMemoryAction =
  | "list"
  | "create"
  | "update_status"
  | "link_dependencies"
  | "add_verification"
  | "add_next_action"
  | "complete"
  | "clear";

export type WorkingMemoryTodoInput = {
  action: WorkingMemoryAction;
  scopeId?: string;
  todoId?: string;
  title?: string;
  notes?: string;
  status?: TodoStatus;
  blocks?: string[];
  blockedBy?: string[];
  verification?: string[];
  completedVerification?: string[];
  nextActions?: string[];
};

export type WorkingMemoryTodoOutput = {
  success: boolean;
  type: "task_update" | "workflow_update";
  message: string;
  workflowId: string;
  stepName: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  taskId?: string;
  title?: string;
  taskStatus?: "pending" | "in_progress" | "done" | "error";
  todoStatus?: TodoStatus;
  todos?: WorkingTodo[];
  summary?: string;
  metrics?: ReturnType<typeof computeWorkflowMetrics>;
  error?: string;
};

const dependencyListSchema: JSONSchema7 = arrayProp(
  "Todo IDs to set for dependency linkage",
  stringProp("Todo ID"),
  { maxItems: 32 },
);

const workingMemoryTodoSchema = createToolSchema(
  {
    action: enumProp("Todo action to execute", [
      "list",
      "create",
      "update_status",
      "link_dependencies",
      "add_verification",
      "add_next_action",
      "complete",
      "clear",
    ]),
    scopeId: stringProp("Optional explicit scope override"),
    todoId: stringProp("Todo ID for update operations"),
    title: stringProp("Todo title", { minLength: 1, maxLength: 280 }),
    notes: stringProp("Optional notes"),
    status: enumProp("Todo status", ["pending", "in_progress", "completed"]),
    blocks: dependencyListSchema,
    blockedBy: dependencyListSchema,
    verification: arrayProp(
      "Verification checks required before completion",
      stringProp("Verification step"),
      { maxItems: 32 },
    ),
    completedVerification: arrayProp(
      "Verification checks already completed",
      stringProp("Completed verification step"),
      { maxItems: 32 },
    ),
    nextActions: arrayProp("Immediate next actions", stringProp("Action"), {
      maxItems: 32,
    }),
  },
  ["action"],
  { additionalProperties: false },
);

const workflowSummarySchema: JSONSchema7 = objectProp(
  "Workflow aggregate metrics",
  {
    total: { type: "integer", minimum: 0 },
    pending: { type: "integer", minimum: 0 },
    inProgress: { type: "integer", minimum: 0 },
    completed: { type: "integer", minimum: 0 },
    blocked: { type: "integer", minimum: 0 },
  },
);

function getSessionId(context?: ToolExecutionContext): string | null {
  const candidate = context?.metadata?.sessionId;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

function dedupeStrings(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function findTodo(state: WorkingMemoryState, todoId?: string): WorkingTodo | undefined {
  if (!todoId) return undefined;
  return state.todos.find((todo) => todo.id === todoId);
}

function nowIso(): string {
  return new Date().toISOString();
}

function toTaskEventStatus(status: TodoStatus): "pending" | "in_progress" | "done" {
  if (status === "completed") return "done";
  return status;
}

function normalizeInProgressInvariant(
  todos: WorkingTodo[],
  activeTodoId: string,
): WorkingTodo[] {
  return todos.map((todo) => {
    if (todo.id === activeTodoId) return todo;
    if (todo.status !== "in_progress") return todo;
    return {
      ...todo,
      status: "pending",
      updatedAt: nowIso(),
    };
  });
}

function buildDependencyAdjacency(state: WorkingMemoryState): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const todo of state.todos) {
    adjacency.set(todo.id, []);
  }

  for (const todo of state.todos) {
    const directBlocks = dedupeStrings(todo.blocks).filter((id) => adjacency.has(id));
    const dependsOn = dedupeStrings(todo.blockedBy).filter((id) => adjacency.has(id));

    adjacency.set(todo.id, dedupeStrings([...(adjacency.get(todo.id) ?? []), ...directBlocks]));
    for (const dep of dependsOn) {
      const list = adjacency.get(dep) ?? [];
      adjacency.set(dep, dedupeStrings([...list, todo.id]));
    }
  }

  return adjacency;
}

function hasDependencyCycle(state: WorkingMemoryState): boolean {
  const adjacency = buildDependencyAdjacency(state);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);

    const children = adjacency.get(node) ?? [];
    for (const child of children) {
      if (visit(child)) return true;
    }

    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const node of adjacency.keys()) {
    if (visit(node)) return true;
  }

  return false;
}

function buildOutput(args: {
  success: boolean;
  workflowId: string;
  message: string;
  state: WorkingMemoryState;
  type?: "task_update" | "workflow_update";
  task?: WorkingTodo;
  stepName: string;
  status?: "pending" | "running" | "completed" | "failed";
  error?: string;
}): WorkingMemoryTodoOutput {
  const metrics = computeWorkflowMetrics(args.state);
  const progress =
    metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0;
  const type = args.type ?? (args.task ? "task_update" : "workflow_update");
  const status = args.status ?? (args.success ? "running" : "failed");

  return {
    success: args.success,
    type,
    message: args.message,
    workflowId: args.workflowId,
    stepName: args.stepName,
    status,
    progress,
    ...(args.task
      ? {
          taskId: args.task.id,
          title: args.task.title,
          taskStatus: args.success ? toTaskEventStatus(args.task.status) : "error",
          todoStatus: args.task.status,
        }
      : {}),
    todos: args.state.todos,
    summary: summarizeWorkingMemoryState(args.state),
    metrics,
    error: args.error,
  };
}

function completionGuard(todo: WorkingTodo, completedVerification?: string[]): {
  ok: boolean;
  missing: string[];
  nextCompleted: string[];
} {
  const required = dedupeStrings(todo.verification);
  if (!required.length) {
    return {
      ok: true,
      missing: [],
      nextCompleted: dedupeStrings([
        ...todo.completedVerification,
        ...dedupeStrings(completedVerification),
      ]),
    };
  }

  const completed = dedupeStrings([
    ...todo.completedVerification,
    ...dedupeStrings(completedVerification),
  ]);
  const completedSet = new Set(completed);
  const missing = required.filter((step) => !completedSet.has(step));
  return {
    ok: missing.length === 0,
    missing,
    nextCompleted: completed,
  };
}

function ensureKnownTodoIds(
  state: WorkingMemoryState,
  ids: string[],
  currentTodoId: string,
): { ok: boolean; missing: string[]; hasSelfReference: boolean } {
  const known = new Set(state.todos.map((todo) => todo.id));
  const missing = ids.filter((id) => !known.has(id));
  const hasSelfReference = ids.includes(currentTodoId);
  return {
    ok: missing.length === 0 && !hasSelfReference,
    missing,
    hasSelfReference,
  };
}

export const workingMemoryTodosTool = createTool<
  WorkingMemoryTodoInput,
  WorkingMemoryTodoOutput
>({
  description:
    "Manage explicit working-memory todos for complex multi-step workflows: create tasks, set status, link blockers, track verification, and list progress.",
  schema: workingMemoryTodoSchema,
  execute: async (
    input: WorkingMemoryTodoInput,
    context?: ToolExecutionContext,
  ): Promise<WorkingMemoryTodoOutput> => {
    const workflowId = resolveWorkingMemoryScope({
      scopeId: input.scopeId,
      sessionId: getSessionId(context),
      userId: context?.userId ?? null,
    });
    const state = await readWorkingMemoryState(workflowId);
    const safeNotes = input.notes?.trim();
    const now = nowIso();

    switch (input.action) {
      case "list": {
        return buildOutput({
          success: true,
          workflowId,
          message: "Todo list loaded.",
          state,
          type: "workflow_update",
          stepName: "todo_list",
          status: "running",
        });
      }
      case "clear": {
        await clearWorkingMemoryState(workflowId);
        return buildOutput({
          success: true,
          workflowId,
          message: "Todo working memory cleared.",
          state: { todos: [], updatedAt: now },
          type: "workflow_update",
          stepName: "todo_clear",
          status: "completed",
        });
      }
      case "create": {
        const title = input.title?.trim();
        if (!title) {
          return buildOutput({
            success: false,
            workflowId,
            message: "title is required for create action",
            state,
            type: "workflow_update",
            stepName: "todo_create",
            status: "failed",
            error: "missing_title",
          });
        }

        const todo: WorkingTodo = {
          id: nanoid(10),
          title,
          status: "pending",
          blocks: [],
          blockedBy: [],
          verification: [],
          completedVerification: [],
          nextActions: [],
          ...(safeNotes ? { notes: safeNotes } : {}),
          createdAt: now,
          updatedAt: now,
        };
        const nextState = {
          todos: [...state.todos, todo],
          updatedAt: now,
        };
        await writeWorkingMemoryState(workflowId, nextState);
        return buildOutput({
          success: true,
          workflowId,
          message: `Created todo: ${title}`,
          state: nextState,
          task: todo,
          stepName: "todo_create",
          status: "running",
        });
      }
      case "update_status": {
        const todo = findTodo(state, input.todoId);
        if (!todo) {
          return buildOutput({
            success: false,
            workflowId,
            message: "todoId not found",
            state,
            type: "workflow_update",
            stepName: "todo_update_status",
            status: "failed",
            error: "todo_not_found",
          });
        }
        if (!input.status) {
          return buildOutput({
            success: false,
            workflowId,
            message: "status is required for update_status",
            state,
            task: todo,
            stepName: "todo_update_status",
            status: "failed",
            error: "missing_status",
          });
        }

        if (input.status === "completed") {
          const guard = completionGuard(todo, input.completedVerification);
          if (!guard.ok) {
            return buildOutput({
              success: false,
              workflowId,
              message: `Cannot complete todo; pending verification: ${guard.missing.join(", ")}`,
              state,
              task: todo,
              stepName: "todo_update_status",
              status: "failed",
              error: "verification_incomplete",
            });
          }
        }

        let nextTodos = state.todos.map((candidate) => {
          if (candidate.id !== todo.id) return candidate;
          const guard = completionGuard(candidate, input.completedVerification);
          return {
            ...candidate,
            status: input.status!,
            completedVerification: guard.nextCompleted,
            ...(safeNotes ? { notes: safeNotes } : {}),
            updatedAt: now,
          };
        });

        if (input.status === "in_progress") {
          nextTodos = normalizeInProgressInvariant(nextTodos, todo.id);
        }

        const nextState = { todos: nextTodos, updatedAt: now };
        await writeWorkingMemoryState(workflowId, nextState);
        const updated = nextState.todos.find((candidate) => candidate.id === todo.id)!;
        return buildOutput({
          success: true,
          workflowId,
          message: `Updated status for "${updated.title}" to ${updated.status}`,
          state: nextState,
          task: updated,
          stepName: "todo_update_status",
          status: updated.status === "completed" ? "completed" : "running",
        });
      }
      case "link_dependencies": {
        const todo = findTodo(state, input.todoId);
        if (!todo) {
          return buildOutput({
            success: false,
            workflowId,
            message: "todoId not found",
            state,
            type: "workflow_update",
            stepName: "todo_link_dependencies",
            status: "failed",
            error: "todo_not_found",
          });
        }

        const nextBlocks = dedupeStrings(input.blocks);
        const nextBlockedBy = dedupeStrings(input.blockedBy);
        const validation = ensureKnownTodoIds(
          state,
          [...nextBlocks, ...nextBlockedBy],
          todo.id,
        );
        if (!validation.ok) {
          const reason = validation.hasSelfReference
            ? "Self-reference in dependency graph is not allowed."
            : `Unknown todo IDs: ${validation.missing.join(", ")}`;
          return buildOutput({
            success: false,
            workflowId,
            message: reason,
            state,
            task: todo,
            stepName: "todo_link_dependencies",
            status: "failed",
            error: validation.hasSelfReference ? "self_reference" : "unknown_dependency",
          });
        }

        const nextState: WorkingMemoryState = {
          todos: state.todos.map((candidate) =>
            candidate.id === todo.id
              ? {
                  ...candidate,
                  blocks: nextBlocks.length ? nextBlocks : candidate.blocks,
                  blockedBy: nextBlockedBy.length ? nextBlockedBy : candidate.blockedBy,
                  updatedAt: now,
                }
              : candidate,
          ),
          updatedAt: now,
        };

        if (hasDependencyCycle(nextState)) {
          return buildOutput({
            success: false,
            workflowId,
            message: "Dependency update rejected: cycle detected.",
            state,
            task: todo,
            stepName: "todo_link_dependencies",
            status: "failed",
            error: "dependency_cycle",
          });
        }

        await writeWorkingMemoryState(workflowId, nextState);
        const updated = nextState.todos.find((candidate) => candidate.id === todo.id)!;
        return buildOutput({
          success: true,
          workflowId,
          message: `Dependencies updated for "${updated.title}"`,
          state: nextState,
          task: updated,
          stepName: "todo_link_dependencies",
          status: "running",
        });
      }
      case "add_verification": {
        const todo = findTodo(state, input.todoId);
        if (!todo) {
          return buildOutput({
            success: false,
            workflowId,
            message: "todoId not found",
            state,
            type: "workflow_update",
            stepName: "todo_add_verification",
            status: "failed",
            error: "todo_not_found",
          });
        }
        const nextVerification = dedupeStrings([
          ...todo.verification,
          ...dedupeStrings(input.verification),
        ]);
        const nextState: WorkingMemoryState = {
          todos: state.todos.map((candidate) =>
            candidate.id === todo.id
              ? { ...candidate, verification: nextVerification, updatedAt: now }
              : candidate,
          ),
          updatedAt: now,
        };
        await writeWorkingMemoryState(workflowId, nextState);
        const updated = nextState.todos.find((candidate) => candidate.id === todo.id)!;
        return buildOutput({
          success: true,
          workflowId,
          message: `Verification requirements updated for "${updated.title}"`,
          state: nextState,
          task: updated,
          stepName: "todo_add_verification",
          status: "running",
        });
      }
      case "add_next_action": {
        const todo = findTodo(state, input.todoId);
        if (!todo) {
          return buildOutput({
            success: false,
            workflowId,
            message: "todoId not found",
            state,
            type: "workflow_update",
            stepName: "todo_add_next_action",
            status: "failed",
            error: "todo_not_found",
          });
        }
        const nextActions = dedupeStrings([
          ...todo.nextActions,
          ...dedupeStrings(input.nextActions),
        ]);
        const nextState: WorkingMemoryState = {
          todos: state.todos.map((candidate) =>
            candidate.id === todo.id
              ? { ...candidate, nextActions, updatedAt: now }
              : candidate,
          ),
          updatedAt: now,
        };
        await writeWorkingMemoryState(workflowId, nextState);
        const updated = nextState.todos.find((candidate) => candidate.id === todo.id)!;
        return buildOutput({
          success: true,
          workflowId,
          message: `Next actions updated for "${updated.title}"`,
          state: nextState,
          task: updated,
          stepName: "todo_add_next_action",
          status: "running",
        });
      }
      case "complete": {
        const todo = findTodo(state, input.todoId);
        if (!todo) {
          return buildOutput({
            success: false,
            workflowId,
            message: "todoId not found",
            state,
            type: "workflow_update",
            stepName: "todo_complete",
            status: "failed",
            error: "todo_not_found",
          });
        }
        const guard = completionGuard(todo, input.completedVerification);
        if (!guard.ok) {
          return buildOutput({
            success: false,
            workflowId,
            message: `Cannot complete todo; pending verification: ${guard.missing.join(", ")}`,
            state,
            task: todo,
            stepName: "todo_complete",
            status: "failed",
            error: "verification_incomplete",
          });
        }

        const nextState: WorkingMemoryState = {
          todos: state.todos.map((candidate) =>
            candidate.id === todo.id
              ? {
                  ...candidate,
                  status: "completed",
                  completedVerification: guard.nextCompleted,
                  ...(safeNotes ? { notes: safeNotes } : {}),
                  updatedAt: now,
                }
              : candidate,
          ),
          updatedAt: now,
        };
        await writeWorkingMemoryState(workflowId, nextState);
        const updated = nextState.todos.find((candidate) => candidate.id === todo.id)!;
        return buildOutput({
          success: true,
          workflowId,
          message: `Completed todo "${updated.title}"`,
          state: nextState,
          task: updated,
          stepName: "todo_complete",
          status: "completed",
        });
      }
      default: {
        return buildOutput({
          success: false,
          workflowId,
          message: `Unsupported action: ${(input as { action?: string }).action ?? "unknown"}`,
          state,
          type: "workflow_update",
          stepName: "todo_unknown",
          status: "failed",
          error: "unsupported_action",
        });
      }
    }
  },
});

export const workingMemoryTodosToolOutputSchema = workflowSummarySchema;
