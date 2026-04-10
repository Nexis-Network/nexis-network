"use client";

import { CornerDownLeft } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Suggestion, Suggestions } from "./suggestion";
import { useTableEditorChat } from "./table-chat-provider";

export function ChatMessageInput() {
  const { status, sendMessage } = useTableEditorChat();
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="px-3 py-3 lg:px-0">
      <div className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          className="min-h-[60px] w-full resize-none border-0 bg-transparent p-3 shadow-none focus-visible:ring-0"
          disabled={status !== "ready"}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Edit your spreadsheet data (e.g., 'Change the Names in Column A', 'Make Column B uppercase')"
          value={input}
        />
        <div className="flex items-center justify-between p-3 pt-0">
          <div className="text-muted-foreground text-xs">
            {status !== "ready" && "AI is processing..."}
          </div>
          <Button
            className="h-8 w-8 p-0"
            disabled={status !== "ready" || !input.trim()}
            onClick={handleSubmit}
            size="sm"
          >
            <CornerDownLeft className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SpreadsheetSuggestions() {
  const { tableArtifact, sendMessage } = useTableEditorChat();
  const hasData = Boolean(tableArtifact?.data);

  if (!hasData) {
    return null;
  }

  const suggestions = [
    "Suggest 1 more row to add to the dataset",
    "Change the Names in Column A",
    "Make Column B uppercase",
    "Add a total column",
    "Replace values in Column A",
  ];

  return (
    <div className="py-3">
      <div className="mb-2 font-medium text-muted-foreground text-xs">Quick actions:</div>
      <div className="flex flex-wrap gap-2">
        <Suggestions>
          {suggestions.map((suggestion) => (
            <Suggestion
              className="rounded-md bg-background px-2 py-1 text-muted-foreground text-xs transition hover:bg-muted"
              key={suggestion}
              onClick={() => {
                sendMessage({ text: suggestion });
              }}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>
      </div>
    </div>
  );
}
