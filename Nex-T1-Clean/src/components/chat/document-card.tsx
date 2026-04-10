"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useConversationSession } from "@/components/chat/conversation-session-provider";

type DocumentCardProps = {
  title?: string;
  id: string;
  status?: "processing" | "streaming" | "success" | "error";
};

export const DocumentCard: React.FC<DocumentCardProps> = ({ title, id, status }) => {
  const { setOpenedDocumentId, openedDocumentId } = useConversationSession();
  const isActive = openedDocumentId === id;

  const handleActivate = React.useCallback(() => {
    setOpenedDocumentId(id);
  }, [id, setOpenedDocumentId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={handleActivate}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative overflow-hidden rounded-xl border  bg-transparent backbackdrop-blur-lg",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:-translate-y-0.5",
        "border-border hover:border-[#e5e5e5]/15",
        isActive ? "ring-2 ring-[#e5e5e5]/20 border-[#e5e5e5]/20" : "ring-0"
      )}
    >
      {/* subtle gradient shimmer on hover */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0",
          "bg-gradient-to-r from-transparent via-[#e5e5e5]/5 to-transparent",
          "translate-x-[-60%] group-hover:translate-x-[60%]",
          "transition-transform duration-700 ease-out group-hover:opacity-100"
        )}
      />

      {/* content */}
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "text-sm sm:text-base font-medium truncate",
                  isActive ? "text-[#e5e5e5]" : "text-[#e5e5e5]/90"
                )}
                title={title}
              >
                {title ?? "Untitled"}
              </h3>
              {status && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                    "bg-[#e5e5e5]/5 text-[#e5e5e5]/70"
                  )}
                  aria-label={`status: ${status}`}
                >
                  {/* status dot / icon */}
                  {status === "success" ? (
                    <svg
                      className="h-3 w-3 text-[#e5e5e5]/80"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="relative inline-flex h-1.5 w-1.5">
                      <span
                        className={cn(
                          "absolute inline-flex h-full w-full rounded-full opacity-75",
                          status === "streaming" || status === "processing"
                            ? "animate-ping bg-[#e5e5e5]/40"
                            : ""
                        )}
                      />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e5e5e5]" />
                    </span>
                  )}
                  <span className="capitalize">
                    {status === "processing"
                      ? "Processing"
                      : status === "streaming"
                      ? "Streaming"
                      : "Ready"}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-[#e5e5e5]/30 transition-transform",
              "group-hover:translate-x-0.5 group-hover:text-[#e5e5e5]/60"
            )}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M9 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* active underline accent */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 h-px",
          isActive ? "bg-[#e5e5e5]/30" : "bg-transparent",
          "transition-colors"
        )}
      />
    </div>
  );
};
