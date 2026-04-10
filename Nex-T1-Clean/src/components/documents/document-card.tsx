"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ChevronRight, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Database } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { DocumentViewer } from "./document";
import { Doc01Icon, PdfFileIcon, Txt01Icon } from "@/components/shared/uploads/upload-zone";

type Document = Database["public"]["Tables"]["doc_processor_documents"]["Row"];
type Chunk = Database["public"]["Tables"]["doc_processor_document_chunks"]["Row"];
type Entity = Database["public"]["Tables"]["doc_processor_document_entities"]["Row"];
interface DocumentCardProps {
  document: Document;
  chunks: Chunk[];
  entities: Entity[];
}

const FILE_ICON_MAP = {
  pdf: { Icon: PdfFileIcon, bgColor: "bg-red-500/5", color: "text-red-500/90" },
  docx: {
    Icon: Doc01Icon,
    bgColor: "bg-green-500/5",
    color: "text-green-500/90",
  },
  txt: { Icon: Txt01Icon, bgColor: "bg-sky-500/100/5", color: "text-blue-500/90" },
} as const;

export function DocumentCard({ document, chunks, entities }: DocumentCardProps) {
  const router = useRouter();

  const isProcessing = document.status === "processing";
  const isError = document.status === "error";

  const fileTypeConfig = FILE_ICON_MAP[document.file_type] || FILE_ICON_MAP.txt;

  return (
    <Drawer shouldScaleBackground>
      <DrawerTrigger asChild>
        <div
          className="group relative cursor-pointer overflow-hidden rounded-3xl p-4 shadow-[0px_1px_1px_0px_rgba(0,_0,_0,_0.05),_0px_1px_1px_0px_rgba(255,_252,_240,_0.5)_inset,_0px_0px_0px_1px_hsla(0,_0%,_100%,_0.1)_inset,_0px_0px_1px_0px_rgba(28,_27,_26,_0.5)] transition-colors hover:bg-muted/50"
          onClick={() => router.push(`?documentId=${document.id}`)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "rounded-xl p-2 text-primary",
                  "shadow-[0px_1px_1px_0px_rgba(0,_0,_0,_0.05),_0px_1px_1px_0px_rgba(255,_252,_240,_0.5)_inset,_0px_0px_0px_1px_hsla(0,_0%,_100%,_0.1)_inset,_0px_0px_1px_0px_rgba(28,_27,_26,_0.5)]",
                  fileTypeConfig.bgColor
                )}
              >
                {React.createElement(fileTypeConfig.Icon, {
                  className: cn(
                    "size-7 transition-transform duration-200",
                    fileTypeConfig.color,
                    "drop-shadow-sm hover:drop-shadow-md"
                  ),
                })}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium leading-none">{document.title}</h3>
                  <Badge className="font-normal" variant={document.status === "processed" ? "outline" : "secondary"}>
                    {document.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  Uploaded{" "}
                  {formatDistanceToNow(new Date(document.created_at), {
                    addSuffix: true,
                  })}
                </div>
                {isProcessing && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Processing…</span>
                  </div>
                )}
                {isError && document.error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-3 w-3" />
                    {document.error}
                  </div>
                )}
              </div>
            </div>
            <Button className="opacity-0 transition-opacity group-hover:opacity-100" size="icon" variant="ghost">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <div className="container relative mx-auto flex h-[calc(100vh-10rem)] max-w-4xl flex-col py-4">
          <DrawerHeader className="flex-none rounded-[1.05rem] bg-secondary/50 px-1 py-1 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "rounded-r-sm rounded-l-[0.8rem] p-2 text-primary",
                    "shadow-[0px_1px_1px_0px_rgba(0,_0,_0,_0.05),_0px_1px_1px_0px_rgba(255,_252,_240,_0.5)_inset,_0px_0px_0px_1px_hsla(0,_0%,_100%,_0.1)_inset,_0px_0px_1px_0px_rgba(28,_27,_26,_0.5)]",
                    fileTypeConfig.bgColor
                  )}
                >
                  {React.createElement(fileTypeConfig.Icon, {
                    className: cn(
                      "size-5 transition-transform duration-200",
                      fileTypeConfig.color,
                      "ml-1 drop-shadow-sm hover:drop-shadow-md"
                    ),
                  })}
                </div>
                <DrawerTitle className="text-sm tracking-tighter md:text-base lg:font-light">
                  {document.title}
                </DrawerTitle>
              </div>
              <DrawerClose asChild>
                <Button
                  className={cn(
                    "rounded-r-[0.8rem] rounded-l-sm p-2 text-primary",
                    "shadow-[0px_1px_1px_0px_rgba(0,_0,_0,_0.05),_0px_1px_1px_0px_rgba(255,_252,_240,_0.5)_inset,_0px_0px_0px_1px_hsla(0,_0%,_100%,_0.1)_inset,_0px_0px_1px_0px_rgba(28,_27,_26,_0.5)]"
                  )}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <ScrollArea className="-mx-1 flex-1 overflow-hidden px-4 pl-3">
            <div className="py-2">
              <DocumentViewer chunks={chunks} document={document} entities={entities} />
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
