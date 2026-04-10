export function HeroStat({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.06] bg-[#171717] px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/58">
          {label}
        </p>
        <div className="text-[#c4c4c4]">{icon}</div>
      </div>
      <p className="mt-1 text-lg font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="text-xs text-white/56">{caption}</p>
    </div>
  );
}
