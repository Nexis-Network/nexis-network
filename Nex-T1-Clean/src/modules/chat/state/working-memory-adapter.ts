import { nanoid } from "nanoid";

import {
  readWorkingMemoryState,
  resolveWorkingMemoryScope,
  writeWorkingMemoryState,
} from "@/modules/chat/state/working-memory-store";
import type {
  WorkingMemory,
  WorkingMemoryProvider as MemoryProvider,
  WorkingMemoryScope as MemoryScope,
} from "@/modules/chat/state/working-memory-provider";

const MAX_WORKING_MEMORY_ENTRIES = 64;

export class WorkingMemoryAdapter implements MemoryProvider {
  async getWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: MemoryScope;
  }): Promise<WorkingMemory | null> {
    const scope = resolveWorkingMemoryScope({
      scopeId: params.scope === "user" ? params.userId : undefined,
      sessionId: params.scope === "chat" ? params.chatId : undefined,
      userId: params.userId,
    });

    const state = await readWorkingMemoryState(scope);
    const entries = Array.isArray(state.entries) ? state.entries : [];
    if (state.todos.length === 0 && entries.length === 0) {
      return null;
    }

    const recentNotes = [...entries]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
      .map((entry) => (entry.tags.length > 0 ? `${entry.content} [${entry.tags.join(", ")}]` : entry.content));

    const todos = state.todos
      .map((todo) => `- ${todo.title} (${todo.status})`)
      .slice(0, 8);

    const sections = [
      todos.length > 0 ? `## Todos\n${todos.join("\n")}` : "",
      recentNotes.length > 0 ? `## Notes\n${recentNotes.map((note) => `- ${note}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      content: sections,
      updatedAt: new Date(state.updatedAt),
    };
  }

  async updateWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: MemoryScope;
    content: string;
  }): Promise<void> {
    const content = params.content.trim();
    if (!content) return;

    const scope = resolveWorkingMemoryScope({
      scopeId: params.scope === "user" ? params.userId : undefined,
      sessionId: params.scope === "chat" ? params.chatId : undefined,
      userId: params.userId,
    });

    const state = await readWorkingMemoryState(scope);
    const now = new Date().toISOString();
    const entries = Array.isArray(state.entries) ? [...state.entries] : [];

    entries.unshift({
      id: `wm_agent_${nanoid()}`,
      content: content.slice(0, 2000),
      tags: ["agent-router"],
      createdAt: now,
      updatedAt: now,
    });

    await writeWorkingMemoryState(scope, {
      ...state,
      entries: entries.slice(0, MAX_WORKING_MEMORY_ENTRIES),
      updatedAt: now,
    });
  }
}

let providerInstance: WorkingMemoryAdapter | null = null;

export function getWorkingMemoryAdapter(): WorkingMemoryAdapter {
  if (!providerInstance) {
    providerInstance = new WorkingMemoryAdapter();
  }
  return providerInstance;
}
