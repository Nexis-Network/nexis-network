import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AssetInfoCardProps = {
  label: string;
  value: string;
  hint?: string | null;
  className?: string;
};

export function AssetInfoCard({ label, value, hint, className }: AssetInfoCardProps) {
  return (
    <Card className={cn("border-white/10 bg-[#c4c4c4]/5", className)}>
      <CardContent className="space-y-1 p-3">
        <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{label}</div>
        <div className="text-sm font-semibold text-white tabular-nums">{value}</div>
        {hint ? <div className="text-[10px] text-zinc-500">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
