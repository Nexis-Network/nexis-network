import type { TaskResult } from "@/lib/schema";


import { logger } from '@/lib/logger';
export type ListTasksParams = {
  limit?: number;
  offset?: number;
};

export type ListTasksResult = {
  tasks: TaskResult[];
  hasMore: boolean;
};

function toAbsolute(path: string): string {
  if (typeof window !== "undefined") return path;
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const base = explicit || vercel || "http://localhost:3000";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function listTasks(params: ListTasksParams = {}): Promise<ListTasksResult> {
  const searchParams = new URLSearchParams();
  if (typeof params.limit === "number") searchParams.set("limit", params.limit.toString());
  if (typeof params.offset === "number") searchParams.set("offset", params.offset.toString());

  const query = searchParams.toString();
  const endpoint = query.length > 0 ? `/api/nex/tasks/history?${query}` : "/api/nex/tasks/history";

  try {
    const response = await fetch(toAbsolute(endpoint), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to list tasks: ${response.status}`);
    }

    const data = (await response.json().catch(() => ({}))) as {
      tasks?: TaskResult[];
      hasMore?: boolean;
    };

    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      hasMore: Boolean(data.hasMore),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("list_tasks_failed", error);
    }
    return { tasks: [], hasMore: false };
  }
}
