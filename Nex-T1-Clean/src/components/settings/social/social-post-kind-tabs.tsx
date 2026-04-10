"use client";

import { useMemo } from "react";
import { SegmentedTabs, type SegmentedTabOption } from "@/components/ui/tabs";
import type { SocialPostKind } from "@/lib/social/types";

type SocialTabValue = SocialPostKind | "all" | "bookmarks" | "shared";

type SocialPostKindTabsProps = {
  value: SocialTabValue;
  onValueChange: (value: SocialTabValue) => void;
  includeBookmarks?: boolean;
  includeShared?: boolean;
  includeAll?: boolean;
};

export function SocialPostKindTabs({
  value,
  onValueChange,
  includeBookmarks = false,
  includeShared = false,
  includeAll = true,
}: SocialPostKindTabsProps) {
  const options = useMemo(() => {
    const items: SegmentedTabOption<SocialTabValue>[] = [];
    if (includeAll) items.push({ value: "all", label: "All" });
    items.push(
      { value: "post", label: "Posts" },
      { value: "prompt_template", label: "Prompts" },
      { value: "skill_template", label: "Skill.md" },
    );
    if (includeBookmarks) items.push({ value: "bookmarks", label: "Bookmarks" });
    if (includeShared) items.push({ value: "shared", label: "Shared" });
    return items;
  }, [includeAll, includeBookmarks, includeShared]);

  return (
    <SegmentedTabs
      options={options}
      value={value}
      onChange={onValueChange}
    />
  );
}
