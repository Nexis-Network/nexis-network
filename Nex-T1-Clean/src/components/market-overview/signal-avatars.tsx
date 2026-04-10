"use client";

import { cn } from "@/lib/utils";

export type SignalAvatarData = {
  src?: string | null;
  label: string;
};

type SignalAvatarProps = SignalAvatarData & { className?: string };

export function SignalAvatar({ src, label, className }: SignalAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "•";
  return (
    <span
      className={cn(
        "relative flex h-[14px] w-[14px] items-center justify-center overflow-hidden rounded-full",
        className,
      )}
    >
      <span aria-hidden className="absolute inset-0 rounded-full bg-white" />
      <span aria-hidden className="absolute inset-0 rounded-full bg-[rgba(87,101,96,0.2)]" />
      <span aria-hidden className="absolute inset-px rounded-full bg-white" />
      {src ? (
        <span
          aria-hidden
          className="absolute inset-px rounded-full bg-cover bg-center"
          style={{ backgroundImage: `url(${src})` }}
        />
      ) : (
        <span className="relative z-10 text-[8px] font-semibold leading-none text-[#191A1A]">{initial}</span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SignalAvatarStack({ avatars, label }: { avatars: SignalAvatarData[]; label?: string }) {
  return (
    <div
      className="flex h-[14px] w-[23px] items-center justify-start isolate"
      title={label ? `Source: ${label}` : undefined}
    >
      {avatars.slice(0, 2).map((avatar, index) => (
        <SignalAvatar
          key={`${avatar.label}-${index}`}
          {...avatar}
          className={cn(index > 0 ? "-ml-[5px]" : "", index === 0 ? "z-10" : "z-0")}
        />
      ))}
    </div>
  );
}
