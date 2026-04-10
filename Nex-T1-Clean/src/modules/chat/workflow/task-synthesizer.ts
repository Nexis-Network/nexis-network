import type { WorkingTodo } from "@/modules/chat/state/working-memory-store";

export type TaskSynthesisResult = {
  summary: string;
  completedTasks: string[];
  failedTasks: string[];
  artifacts: string[];
  hasFailures: boolean;
};

/**
 * Synthesizes results from multiple completed sub-tasks into
 * a unified summary for the user.
 */
export function synthesizeTaskResults(
  tasks: WorkingTodo[],
  results: Map<string, unknown>,
): TaskSynthesisResult {
  const completedTasks: string[] = [];
  const failedTasks: string[] = [];
  const artifacts: string[] = [];
  const summaryParts: string[] = [];

  for (const task of tasks) {
    const result = results.get(task.id);

    if (task.status === "completed") {
      completedTasks.push(task.id);
      summaryParts.push(`✓ ${task.title}`);

      // Extract artifact IDs from results if present
      if (result && typeof result === "object" && "artifactId" in (result as Record<string, unknown>)) {
        artifacts.push((result as Record<string, unknown>).artifactId as string);
      }
    } else {
      failedTasks.push(task.id);
      const reason = task.notes ?? "unknown reason";
      summaryParts.push(`✗ ${task.title} — ${reason}`);
    }
  }

  return {
    summary: summaryParts.join("\n"),
    completedTasks,
    failedTasks,
    artifacts,
    hasFailures: failedTasks.length > 0,
  };
}
