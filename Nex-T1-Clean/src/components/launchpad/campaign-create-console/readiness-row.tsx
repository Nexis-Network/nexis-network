import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function ReadinessRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-white/[0.06] bg-[#0f0f10] px-3 py-2 text-sm">
      <span className="text-white/86">{label}</span>
      {ok ? (
        <CheckCircle2 className="size-4 stroke-[1.5]" />
      ) : (
        <AlertTriangle className="size-4 stroke-[1.5]" />
      )}
    </div>
  );
}
