"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, LayoutPanelTop } from "lucide-react";

import { CreateConversationPanel } from "./create-conversation-panel";
import { CreateHistoryList } from "./create-history-list";
import { CreatePreviewPanel } from "./create-preview-panel";

type CreateBuilderMobileProps = {
  conversationProps: ComponentProps<typeof CreateConversationPanel>;
  historyProps: ComponentProps<typeof CreateHistoryList>;
  mobileTab: string;
  onMobileTabChange: (value: string) => void;
  previewProps: ComponentProps<typeof CreatePreviewPanel>;
};

export function CreateBuilderMobile({
  conversationProps,
  historyProps,
  mobileTab,
  onMobileTabChange,
  previewProps,
}: CreateBuilderMobileProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:hidden">
      <Tabs className="flex min-h-0 flex-1 flex-col" onValueChange={onMobileTabChange} value={mobileTab}>
        <div className="flex items-center justify-between border-b border-[var(--auth-border-subtle)] bg-[var(--auth-card-bg)] px-3 py-3">
          <TabsList className="h-auto border border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)]">
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                className="rounded-full border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)]"
                size="sm"
                type="button"
                variant="outline"
              >
                <FolderOpen className="size-4" />
                Projects
              </Button>
            </SheetTrigger>
            <SheetContent className="border-r border-[var(--auth-border-subtle)] bg-[var(--auth-app-bg)] p-0" side="left">
              <SheetHeader className="border-b border-border/60">
                <SheetTitle>Project history</SheetTitle>
                <SheetDescription>
                  Resume or claim your latest builder sessions.
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1">
                <CreateHistoryList {...historyProps} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <TabsContent className="mt-0 min-h-0 flex-1" value="build">
          <div className="min-h-0 overflow-hidden">
            <CreateConversationPanel
              {...conversationProps}
              historyAction={
                <Button
                  className="rounded-full border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)]"
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <LayoutPanelTop className="size-4" />
                  Builder
                </Button>
              }
            />
          </div>
        </TabsContent>

        <TabsContent className="mt-0 flex-1" value="preview">
          <CreatePreviewPanel {...previewProps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
