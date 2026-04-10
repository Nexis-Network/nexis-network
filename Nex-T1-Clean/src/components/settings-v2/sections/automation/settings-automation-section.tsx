"use client";

import { useSearchParams } from "next/navigation";

import { GuardianCouncilManager } from "@/components/settings/automation/guardian-manager";
import { PaymasterBalancesCard } from "@/components/settings/automation/paymaster-balances-card";
import { SessionKeyManager } from "@/components/settings/automation/session-key-manager";
import { StrategyManager } from "@/components/settings/automation/strategy-manager";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { useUserTasks } from "@/lib/hooks/tasks/use-user-tasks";

function ScheduledTasksView() {
  const { data, isLoading, error } = useUserTasks({ limit: 8 });
  const tasks = data?.tasks ?? [];

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title="Scheduled tasks"
        description="Monitor pending and recurring jobs created for your account and agents."
      />

        <SettingsPanel title="Upcoming task runs" description="Recent tasks pulled from your task queue.">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading task runs...</p>
        ) : error ? (
          <p className="text-sm text-red-300">{error.message}</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled tasks found.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[task.agent, task.kind, task.scheduledFor].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="rounded-md border border-border/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>
                {task.lastSummary ? (
                  <p className="mt-2 text-sm text-muted-foreground">{task.lastSummary}</p>
                ) : null}
                {task.lastError ? <p className="mt-2 text-sm text-rose-300">{task.lastError}</p> : null}
              </div>
            ))}
          </div>
        )}
      </SettingsPanel>
    </SettingsPage>
  );
}

export function SettingsAutomationSection() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") ?? "strategies";

  if (activeView === "schedules") {
    return <ScheduledTasksView />;
  }

  if (activeView === "guardians") {
    return <GuardianCouncilManager />;
  }

  if (activeView === "session-keys") {
    return <SessionKeyManager />;
  }

  if (activeView === "paymaster") {
    return <PaymasterBalancesCard />;
  }

  return (
    <SettingsPage className="space-y-6">
      <SettingsPageHeader
        title="Automation strategies"
        description="Configure agent strategies and deterministic guardrails for recurring execution."
      />
      <StrategyManager />
    </SettingsPage>
  );
}
