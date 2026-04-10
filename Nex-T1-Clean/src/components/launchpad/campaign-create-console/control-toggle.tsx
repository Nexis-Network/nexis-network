import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ControlToggle({
  title,
  description,
  checked,
  onCheckedChange,
  id,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-[#161616] p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {title}
        </Label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-white/58">{description}</p>
    </div>
  );
}
