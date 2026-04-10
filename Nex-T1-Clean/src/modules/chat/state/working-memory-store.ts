import { redis } from "@/server/services/redis";
import { logger } from "@/lib/logger";

const WORKING_MEMORY_KEY_PREFIX = "chat:working-memory:";
const WORKING_MEMORY_TTL_SECONDS = 60 * 60 * 24; // 24h

export type TodoStatus = "pending" | "in_progress" | "completed";

export type WorkingTodo = {
  id: string;
  title: string;
  status: TodoStatus;
  blocks: string[];
  blockedBy: string[];
  verification: string[];
  completedVerification: string[];
  nextActions: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkingMemoryEntry = {
  id: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type WorkingMemoryState = {
  todos: WorkingTodo[];
  entries?: WorkingMemoryEntry[];
  updatedAt: string;
};

export type WorkingMemoryScopeInput = {
  scopeId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
};

const EMPTY_STATE: WorkingMemoryState = {
  todos: [],
  entries: [],
  updatedAt: new Date(0).toISOString(),
};

export function resolveWorkingMemoryScope({
  scopeId,
  sessionId,
  userId,
}: WorkingMemoryScopeInput): string {
  if (scopeId && scopeId.trim().length > 0) {
    return `scope:${scopeId.trim()}`;
  }
  if (sessionId && sessionId.trim().length > 0) {
    return `session:${sessionId.trim()}`;
  }
  if (userId && userId.trim().length > 0) {
    return `user:${userId.trim()}`;
  }
  return "anonymous";
}

function getWorkingMemoryKey(scope: string): string {
  return `${WORKING_MEMORY_KEY_PREFIX}${scope}`;
}

function sanitizeTodo(todo: WorkingTodo): WorkingTodo {
  return {
    ...todo,
    title: todo.title.trim(),
    status: todo.status,
    blocks: Array.from(new Set(todo.blocks.map((id) => id.trim()).filter(Boolean))),
    blockedBy: Array.from(new Set(todo.blockedBy.map((id) => id.trim()).filter(Boolean))),
    verification: Array.from(new Set(todo.verification.map((step) => step.trim()).filter(Boolean))),
    completedVerification: Array.from(
      new Set(todo.completedVerification.map((step) => step.trim()).filter(Boolean)),
    ),
    nextActions: Array.from(new Set(todo.nextActions.map((step) => step.trim()).filter(Boolean))),
    notes: todo.notes?.trim() || undefined,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
}

function sanitizeState(state: WorkingMemoryState): WorkingMemoryState {
  const entries = Array.isArray(state.entries)
    ? state.entries
        .map((entry) => {
          const content = typeof entry.content === "string" ? entry.content.trim() : "";
          if (!content) return null;
          return {
            id: entry.id,
            content,
            tags: Array.from(
              new Set(
                (Array.isArray(entry.tags) ? entry.tags : [])
                  .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
                  .filter(Boolean),
              ),
            ),
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          } as WorkingMemoryEntry;
        })
        .filter((entry): entry is WorkingMemoryEntry => Boolean(entry))
    : [];

  return {
    todos: state.todos.map(sanitizeTodo),
    entries,
    updatedAt: state.updatedAt,
  };
}

export async function readWorkingMemoryState(scope: string): Promise<WorkingMemoryState> {
  const key = getWorkingMemoryKey(scope);
  try {
    const raw = await redis.get<string | WorkingMemoryState>(key);
    if (!raw) {
      return { ...EMPTY_STATE };
    }
    const parsed =
      typeof raw === "string"
        ? (JSON.parse(raw) as WorkingMemoryState)
        : (raw as WorkingMemoryState);
    if (!parsed || !Array.isArray(parsed.todos)) {
      return { ...EMPTY_STATE };
    }
    return sanitizeState({
      todos: parsed.todos,
      entries: Array.isArray((parsed as { entries?: UntypedJson }).entries)
        ? ((parsed as { entries?: WorkingMemoryEntry[] }).entries ?? [])
        : [],
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt
          ? parsed.updatedAt
          : new Date().toISOString(),
    });
  } catch (error) {
    logger.warn("[working-memory] failed to read state", { scope, error });
    return { ...EMPTY_STATE };
  }
}

export async function writeWorkingMemoryState(
  scope: string,
  state: WorkingMemoryState,
): Promise<void> {
  const key = getWorkingMemoryKey(scope);
  const nextState = sanitizeState({
    todos: state.todos,
    entries: state.entries ?? [],
    updatedAt: new Date().toISOString(),
  });
  try {
    await redis.set(key, JSON.stringify(nextState), { ex: WORKING_MEMORY_TTL_SECONDS });
  } catch (error) {
    logger.warn("[working-memory] failed to write state", { scope, error });
  }
}

export async function clearWorkingMemoryState(scope: string): Promise<void> {
  const key = getWorkingMemoryKey(scope);
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn("[working-memory] failed to clear state", { scope, error });
  }
}

export function computeWorkflowMetrics(state: WorkingMemoryState): {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
} {
  const byId = new Map(state.todos.map((todo) => [todo.id, todo]));
  let blocked = 0;
  let pending = 0;
  let inProgress = 0;
  let completed = 0;

  for (const todo of state.todos) {
    if (todo.status === "pending") pending += 1;
    if (todo.status === "in_progress") inProgress += 1;
    if (todo.status === "completed") completed += 1;

    const isBlocked = todo.blockedBy.some((id) => {
      const blocker = byId.get(id);
      return !blocker || blocker.status !== "completed";
    });
    if (isBlocked) blocked += 1;
  }

  return {
    total: state.todos.length,
    pending,
    inProgress,
    completed,
    blocked,
  };
}

export function summarizeWorkingMemoryState(state: WorkingMemoryState): string {
  const metrics = computeWorkflowMetrics(state);
  const active = state.todos.find((todo) => todo.status === "in_progress") ?? null;
  const blocked = state.todos.filter((todo) =>
    todo.blockedBy.some((id) => {
      const blocker = state.todos.find((candidate) => candidate.id === id);
      return !blocker || blocker.status !== "completed";
    }),
  );
  const verificationQueue = state.todos
    .filter((todo) => todo.verification.length > 0 && todo.status !== "completed")
    .slice(0, 4);
  const nextActionQueue = state.todos
    .filter((todo) => todo.nextActions.length > 0 && todo.status !== "completed")
    .slice(0, 4);

  const lines: string[] = [
    `Workflow: total=${metrics.total}, pending=${metrics.pending}, in_progress=${metrics.inProgress}, completed=${metrics.completed}, blocked=${metrics.blocked}`,
    active ? `Active: ${active.title} (${active.id})` : "Active: none",
  ];

  const memoryEntries = Array.isArray(state.entries) ? state.entries : [];
  if (memoryEntries.length > 0) {
    const topEntries = [...memoryEntries]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4)
      .map((entry) =>
        entry.tags.length > 0
          ? `${entry.content} [${entry.tags.join(", ")}]`
          : entry.content,
      )
      .join(" | ");
    if (topEntries) {
      lines.push(`Memory notes: ${topEntries}`);
    }
  }

  if (blocked.length > 0) {
    lines.push(
      `Blocked: ${blocked
        .slice(0, 4)
        .map((todo) => `${todo.title} <- [${todo.blockedBy.join(", ")}]`)
        .join(" | ")}`,
    );
  }

  if (verificationQueue.length > 0) {
    lines.push(
      `Verification: ${verificationQueue
        .map((todo) => `${todo.title}: ${todo.verification.join(", ")}`)
        .join(" | ")}`,
    );
  }

  if (nextActionQueue.length > 0) {
    lines.push(
      `Next actions: ${nextActionQueue
        .map((todo) => `${todo.title}: ${todo.nextActions.join(", ")}`)
        .join(" | ")}`,
    );
  }

  return lines.join("\n").slice(0, 2000);
}

export async function getWorkingMemorySummary(input: WorkingMemoryScopeInput): Promise<string> {
  const scope = resolveWorkingMemoryScope(input);
  const state = await readWorkingMemoryState(scope);
  const hasEntries = Array.isArray(state.entries) && state.entries.length > 0;
  if (!state.todos.length && !hasEntries) {
    return "Working memory: no active todos.";
  }
  return summarizeWorkingMemoryState(state);
}
