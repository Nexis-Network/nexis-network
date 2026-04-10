import { cn } from "@/lib/utils";
import { DynamicAvatar } from "@/components/ui/dynamic-avatar";

interface WalletBlockieProps {
  address: string;
  className?: string;
  size?: number;
  scale?: number;
}

export const WalletBlockie = ({ 
  address, 
  className,
  size = 8,
  scale = 4
}: WalletBlockieProps) => {
  const dimension = size * scale;

  return (
    <DynamicAvatar 
      address={address} 
      size={dimension} 
      className={cn("rounded-md", className)} 
    />
  );
};
