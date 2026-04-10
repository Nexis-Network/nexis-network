"use client";

import { memo } from "react";
import { IconPaperclip, IconX } from "@tabler/icons-react";

import type { AttachmentItem } from "./use-attachments";

type AttachmentsListProps = {
  attachments: AttachmentItem[];
  onRemove: (id: string) => void;
};

function AttachmentsListComponent({
  attachments,
  onRemove,
}: AttachmentsListProps) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/30 px-3 py-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1 text-[11px]"
        >
          <IconPaperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[160px] truncate text-muted-foreground">
            {attachment.file.name}
          </span>
          <button
            type="button"
            className="text-muted-foreground ring-0 ring-transparent transition hover:text-foreground"
            onClick={() => onRemove(attachment.id)}
            aria-label={`Remove ${attachment.file.name}`}
          >
            <IconX className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export const AttachmentsList = memo(AttachmentsListComponent);
