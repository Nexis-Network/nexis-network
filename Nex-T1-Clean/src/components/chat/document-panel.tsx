"use client";

import { useMemo, useRef } from "react";
// import { SelectionMenu } from "@/components/chat/selection-menu"; // Temporarily disabled while searching for/stubbing dependency
import { useConversationSession } from "@/components/chat/conversation-session-provider";
import { findOpenedDocumentPart } from "@/components/chat/document-utils";
import { AnimatePresence, motion } from "framer-motion"; // Changed to framer-motion as it is more likely
import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
// import { useChat } from "@ai-sdk/react"; // Assuming we might not need this if we use context messages

export function DocumentPanel({ embedded = false }: { embedded?: boolean }) {
  const { openedDocumentId, setOpenedDocumentId, messages } =
    useConversationSession();

  const openedDocPart = useMemo(() => {
    return findOpenedDocumentPart(messages, openedDocumentId);
  }, [messages, openedDocumentId]);

  /*
  const [selectionMenu, setSelectionMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
    inputValue: "",
  });
  */
  const documentRef = useRef<HTMLDivElement>(null);

  /*
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && documentRef.current) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectionMenu({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 60,
        selectedText: selection.toString(),
        inputValue: "",
      });
    } else {
      setSelectionMenu((prev) => ({ ...prev, visible: false }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectionMenu.visible &&
        !(event.target as Element).closest(".selection-menu")
      ) {
        setSelectionMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectionMenu.visible]);
  */



  return (
    <AnimatePresence mode="wait" initial={false}>
      {openedDocumentId && (
        <motion.div
          key={openedDocumentId}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "flex h-full flex-1 flex-col overflow-x-hidden overflow-y-auto",
            embedded
              ? "bg-transparent"
              : "border-l border-[#3a3a3a] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          )}
        >
          {openedDocPart ? (
            <>
              {!embedded ? (
                <div className="flex items-center justify-between gap-4 border-b border-[#3a3a3a] p-4">
                  <h2 className="flex items-center gap-2 text-lg font-medium text-[#e5e5e5]">
                    {openedDocPart.data.title || "Untitled"}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e5e5e5]/5 px-2 py-0.5 text-[11px] text-[#e5e5e5]/70">
                      <span className="relative inline-flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e5e5e5]/40 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e5e5e5]" />
                      </span>
                      {openedDocPart.data.status
                        ? openedDocPart.data.status.charAt(0).toUpperCase() +
                          openedDocPart.data.status.slice(1)
                        : null}
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpenedDocumentId(null)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e5e5]/15 text-[#e5e5e5]/70 transition-colors hover:border-[#e5e5e5]/30 hover:text-white"
                    aria-label="Close document"
                    title="Close"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6l12 12M18 6L6 18"
                      />
                    </svg>
                  </button>
                </div>
              ) : null}

              <div className={cn("flex-1 overflow-auto", embedded ? "px-1 py-4" : "p-8")}>
                <div className="max-w-2xl mx-auto">
                  <div
                    ref={documentRef}
                    className="text-[#e5e5e5] leading-relaxed space-y-4 text-base select-text"
                  >
                    {openedDocPart.data.content ? (
                      <Response className="">{openedDocPart.data.content}</Response>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                         <p>Loading content...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
             /* Fallback when ID is set but part not found yet */
             <div className="flex flex-col h-full">
                {!embedded ? (
                  <div className="flex items-center justify-end border-b border-[#3a3a3a] p-4">
                    <button
                      type="button"
                      onClick={() => setOpenedDocumentId(null)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e5e5]/15 text-[#e5e5e5]/70 transition-colors hover:border-[#e5e5e5]/30 hover:text-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 6l12 12M18 6L6 18"
                        />
                      </svg>
                    </button>
                  </div>
                ) : null}
                <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background/95">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p>Loading document...</p>
                  </div>
                </div>
             </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
