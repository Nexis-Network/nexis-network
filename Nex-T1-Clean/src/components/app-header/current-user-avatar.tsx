"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { usePreferredAvatar } from "@/lib/hooks/user/use-preferred-avatar";

type CurrentUserAvatarProps = {
  className?: string;
};

export const CurrentUserAvatar = ({ className }: CurrentUserAvatarProps) => {
  const { preferredAddress } = usePreferredAvatar({ includeConnectedEoa: true });
  return (
    <UserAvatar
      walletAddress={preferredAddress}
      className={className}
      fallback="?"
    />
  );
};
