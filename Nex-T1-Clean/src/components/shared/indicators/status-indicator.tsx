"use client";

type StatusIndicatorProps = {
  status?: "ready" | "streaming" | "submitted" | string | null;
};

export function StatusIndicator({
  status = "ready",
}: StatusIndicatorProps) {
  if (status === "ready" || !status) {
    return null;
  }

  return (
    <div className="text-center text-muted-foreground text-sm">
      {status === "streaming" && "AI is thinking..."}
      {status === "submitted" && "Processing..."}
    </div>
  );
}
