import { Activity } from "lucide-react";

export function FixedFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-8 w-full items-center justify-between border-t border-[rgba(244,244,244,0.1)] bg-[#0F0F10] px-4 text-[11px] font-medium text-[#888891] backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">
          This site is operated by Nexis Foundation, utilizing software open sourced by Nexis Labs.
        </span>
        <span className="sm:hidden">© Nexis Foundation</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#1AFFB9] shadow-[0_0_8px_rgba(26,255,185,0.4)]" />
          <span className="text-[#888891] tracking-tight">Operational</span>
        </div>

        <div className="flex items-center gap-1.5 hidden md:flex">
          <div className="relative flex h-[18px] w-[18px] items-center justify-center">
            <Activity className="h-3 w-3 text-[#888891]" />
          </div>
          <span className="text-[#888891] tracking-tight">Mainnet</span>
        </div>
      </div>
    </footer>
  );
}
