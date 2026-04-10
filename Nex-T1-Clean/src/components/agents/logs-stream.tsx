import { ScrollArea } from "@/components/ui/scroll-area";

export function LogsStream({ logs }: { logs: Array<{ id: string; message: string; timestamp: string }> }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-6 text-sm text-muted-foreground">
        Live logs will appear here once the agent is deployed.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30">
      <ScrollArea className="max-h-72 rounded-2xl p-4" aria-live="polite">
        <ul className="space-y-3 text-sm" role="log" aria-live="polite" aria-relevant="additions text">
          {logs.map((log) => (
            <li key={log.id} className="rounded-xl border border-white/5 bg-white/3 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground/70">{formatIso(log.timestamp)}</div>
              <p className="text-sm text-muted-foreground/90">{log.message}</p>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

function formatIso(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}
