"use client";

import { BellIcon } from "@/components/sidebar-03/animated-icons";
import { useEffect, useState } from "react";

import { BentoCard, BentoCardHeader } from "../shared/bento-card";
import { ActivityRow } from "./activity-row";

interface ActivityItem {
  id: string;
  subject: string;
  verb: string;
  object?: string;
  timestamp: string;
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeedCard() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Placeholder — in production, this connects to Supabase Realtime
  useEffect(() => {
    setActivities([
      { id: "1", subject: "System", verb: "is ready for", object: "activity tracking", timestamp: formatRelativeTime(new Date()) },
    ]);
  }, []);

  return (
    <BentoCard>
      <BentoCardHeader
        title="Activity"
        status="online"
        action={
          <span className="text-[10px] text-[var(--bento-text-muted)]">
            {activities.length > 0 ? "Live" : "No activity"}
          </span>
        }
      />
      {activities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <BellIcon className="size-6 text-[var(--bento-text-muted)]/40" />
          <p className="text-xs text-[var(--bento-text-muted)]">No recent activity</p>
        </div>
      ) : (
        <div>
          {activities.map((item, idx) => (
            <ActivityRow
              key={item.id}
              subject={item.subject}
              verb={item.verb}
              object={item.object}
              timestamp={item.timestamp}
              isLast={idx === activities.length - 1}
            />
          ))}
        </div>
      )}
    </BentoCard>
  );
}
