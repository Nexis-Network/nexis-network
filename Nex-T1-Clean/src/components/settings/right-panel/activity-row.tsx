import { MonoValue } from "../shared/mono-value";

interface ActivityRowProps {
  subject: string;
  verb: string;
  object?: string;
  timestamp: string;
  isLast?: boolean;
}

export function ActivityRow({ subject, verb, object, timestamp, isLast }: ActivityRowProps) {
  return (
    <div className="relative flex gap-3 pb-4">
      {/* Timeline node + line */}
      <div className="flex flex-col items-center">
        <div className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--bento-border)]" />
        {!isLast && <div className="w-px flex-1 bg-[var(--bento-border)]" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-[11px] leading-relaxed">
          <span className="font-medium text-[var(--bento-text-primary)]">{subject}</span>
          {" "}
          <span className="text-[var(--bento-text-muted)]">{verb}</span>
          {object && (
            <>
              {" "}
              <span className="font-medium text-[var(--bento-text-primary)]">{object}</span>
            </>
          )}
        </p>
        <MonoValue className="mt-0.5 block text-[10px] text-[var(--bento-text-muted)]/60">
          {timestamp}
        </MonoValue>
      </div>
    </div>
  );
}
