"use client";

import { ArrowUpRight, Users, KeyRound, Link2 } from "lucide-react";
import Link from "next/link";

import { useTranslations } from "@/components/providers/locale-provider";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Button } from "@/components/settings/shared/settings-button";
import { getProfileQuickActionsCopy } from "@/modules/settings/i18n";

export function ProfileQuickActionsCard() {
  const t = useTranslations("settingsNav");
  const copy = getProfileQuickActionsCopy(t);
  const actions = copy.actions.map((action) => ({
    ...action,
    icon:
      action.id === "invite" ? (
        <Users className="h-4 w-4" />
      ) : action.id === "api-key" ? (
        <KeyRound className="h-4 w-4" />
      ) : (
        <Link2 className="h-4 w-4" />
      ),
  }));

  return (
    <BentoCard>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">{copy.title}</h3>
      </div>

      <div className="mt-4 space-y-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-between text-left hover:bg-white/5"
            asChild
          >
            <Link href={action.href}>
              <span className="flex flex-col items-start">
                <span className="flex items-center gap-2 text-sm font-regular">
                  {action.icon}
                  {action.label}
                </span>
                <span className="text-xs text-[var(--bento-text-muted)]">{action.description}</span>
              </span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        ))}
      </div>
    </BentoCard>
  );
}
