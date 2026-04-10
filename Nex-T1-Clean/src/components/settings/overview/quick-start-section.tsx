"use client";

import { Key, Cloud, Check, Wallet } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/settings/shared/settings-button";
import { cn } from "@/lib/utils";
import { useOnboardingTasks, type OnboardingTaskId } from "@/lib/hooks/user/use-onboarding-tasks";
import { ConnectWalletModal } from "@/components/wallets/connect-wallet-modal";
import { SettingsSection } from "@/components/settings/shared/settings-section";

interface QuickStartSectionProps {
  className?: string;
}

export function QuickStartSection({ className }: QuickStartSectionProps) {
  const router = useRouter();
  const { tasks, markTaskComplete, isLoading } = useOnboardingTasks();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const handleAction = (taskId: OnboardingTaskId) => {
    switch (taskId) {
      case "connect-wallet":
        setWalletModalOpen(true);
        break;
      case "create-api-key":
        router.push("/settings/api");
        markTaskComplete("create-api-key");
        break;
      case "explore-nex":
        router.push("/app");
        markTaskComplete("explore-nex");
        break;
    }
  };

  const handleWalletConnected = () => {
    markTaskComplete("connect-wallet");
    setWalletModalOpen(false);
  };

  const getIcon = (taskId: OnboardingTaskId) => {
    switch (taskId) {
      case "connect-wallet":
        return Wallet;
      case "create-api-key":
        return Key;
      case "explore-nex":
        return Cloud;
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-6 w-32 animate-pulse rounded bg-[var(--settings-elevated)]" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[20px] border border-[var(--bento-border)] bg-[var(--settings-elevated)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <SettingsSection
        title="Quick Start"
        description="Complete your onboarding by finishing these tasks"
        className={className}
      >
        <div className="bento-card !p-0 divide-y divide-[var(--bento-border)]">
          {tasks.map((task) => {
            const Icon = getIcon(task.id);
            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    task.completed
                        ? "border-[var(--settings-border-strong)] bg-[var(--settings-foreground-strong)] text-[var(--settings-card-bg)]"
                        : "border-[var(--settings-border-soft)] bg-transparent"
                    )}
                  >
                    {task.completed && <Check className="size-3" />}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-sm font-medium text-[var(--bento-text-primary)]",
                        task.completed && "text-[var(--bento-text-muted)] line-through"
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="text-xs text-[var(--bento-text-muted)]">
                      {task.description}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(task.id)}
                  disabled={task.completed}
                  className={cn(
                    "settings-surface-button shrink-0 gap-2 text-sm",
                    task.completed && "opacity-50"
                  )}
                >
                  <Icon className="size-4" />
                  {task.action}
                </Button>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <ConnectWalletModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        onSuccess={handleWalletConnected}
      />
    </>
  );
}
