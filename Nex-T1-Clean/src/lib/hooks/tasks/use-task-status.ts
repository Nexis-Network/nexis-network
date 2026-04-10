import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type TaskStatusAction = "pause" | "resume" | "run_now";

export function useTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, action }: { taskId: string; action: TaskStatusAction }) => {
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/api/nex/tasks/${taskId}/status`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(detail || "Unable to update task");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] }).catch(() => {});
    },
  });
}

