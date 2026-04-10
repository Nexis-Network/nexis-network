export function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-transparent px-1 py-1 text-white/70">
      <span className="text-xs uppercase tracking-[0.12em] text-white/54">
        {label}
      </span>
      <span className="text-right font-mono text-xs text-white/88">
        {value}
      </span>
    </div>
  );
}
