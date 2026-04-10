"use client";

import { useRealtimeTaskTrigger } from "@trigger.dev/react-hooks";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskType } from "@/lib/schema";
import { useTaskContext } from "@/lib/task-context";
import { TaskContainer } from "./task-container";

export function TaskPlayground() {
  const { triggerToken, triggerRefresh } = useTaskContext();
  const [topic, setTopic] = useState("");
  const [searchSuggestions] = useState([
    "react",
    "typescript",
    "ai",
    "rust",
    "webdev",
  ]);

  const {
    submit: submitChain,
    run: chainRun,
    isLoading: isChainLoading,
  } = useRealtimeTaskTrigger("story-chain-task", { accessToken: triggerToken });

  const handleSubmit = async () => {
    try {
      if (!topic.trim()) {
        toast.error("Please enter a topic to analyze");
        return;
      }

      await submitChain({ topic: topic.trim() });
      triggerRefresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process request"
      );
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">
        Start here - search an interesting topic on hn
      </Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            className="h-8 text-sm"
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic to analyze"
            type="text"
            value={topic}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {searchSuggestions.map((suggestion) => (
              <button
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] transition-colors hover:bg-muted/80"
                key={suggestion}
                onClick={() => setTopic(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <Button
          className="h-8 px-3"
          disabled={isChainLoading}
          onClick={handleSubmit}
          size="sm"
        >
          {isChainLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
        </Button>
      </div>

      {(chainRun || isChainLoading) && (
        <TaskContainer
          data={chainRun?.output}
          isLoading={isChainLoading || !chainRun?.output}
          taskId={chainRun?.id || "loading"}
          type={TaskType.CHAIN}
        />
      )}
    </div>
  );
}
