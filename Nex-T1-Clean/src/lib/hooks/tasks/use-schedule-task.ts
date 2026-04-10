"use client";

import { useMutation } from "@tanstack/react-query";

import type { TaskSchedule } from "@/modules/tasks";
import type { NotificationChannel, TaskActionInput } from "@/modules/tasks/action-schema";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export type ScheduleTaskPayload = {
  task: {
    title: string;
    description?: string;
    agent?: string;
    team?: string;
    kind?: string;
    action: TaskActionInput;
    notificationChannels: NotificationChannel[];
    inputs?: Record<string, UntypedJson>;
  };
  schedule: TaskSchedule;
};

export type ScheduleTaskResponse = {
  ok: true;
  createdTaskIds: string[];
};

export function useScheduleTask() {
  return useMutation<ScheduleTaskResponse, Error, ScheduleTaskPayload>({
    mutationFn: async (payload) => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      const response = await fetch("/api/nex/tasks/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        throw new Error(detail || "Unable to schedule task");
      }

      return (await response.json().catch(() => ({ ok: true, createdTaskIds: [] }))) as ScheduleTaskResponse;
    },
  });
}
