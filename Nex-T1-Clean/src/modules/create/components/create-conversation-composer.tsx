"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CreateConversationComposerProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (prompt: string) => void;
  submitting: boolean;
  templateLabel: string | undefined;
};

export function CreateConversationComposer({
  input,
  onInputChange,
  onSubmit,
  submitting,
  templateLabel,
}: CreateConversationComposerProps) {
  return (
    <div className="border-t border-[var(--auth-border-subtle)] bg-[var(--auth-card-bg)] px-4 py-4">
      <PromptInput
        className={cn(
          "mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-[var(--auth-composer-frame-border)] bg-[var(--auth-composer-frame-bg)] shadow-[var(--auth-composer-menu-shadow)]",
          submitting && "opacity-90",
        )}
        onSubmit={({ text }) => {
          onSubmit(text ?? "");
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            className="min-h-24 border-0 bg-transparent text-[var(--auth-composer-text)] placeholder:text-[var(--auth-composer-placeholder)] focus-visible:ring-0"
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Build a Base payments app with Supabase auth, Stripe billing, wallet connect, and a polished preview-first dashboard..."
            value={input}
          />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            <Badge className="rounded-full border-[var(--auth-border-subtle)] px-3 py-1 text-[var(--auth-composer-muted)]" variant="outline">
              {templateLabel}
            </Badge>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={submitting || input.trim().length === 0}
            status={submitting ? "submitted" : "ready"}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
