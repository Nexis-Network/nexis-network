export function FlowStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-white/[0.06] bg-[#151515] px-3 py-2.5">
      <span className="inline-flex min-w-[28px] justify-center rounded-md border border-white/[0.08] bg-[#1f1f20] px-1 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-[#c4c4c4]">
        {number}
      </span>
      <p className="leading-5 text-white/62">{text}</p>
    </div>
  );
}
