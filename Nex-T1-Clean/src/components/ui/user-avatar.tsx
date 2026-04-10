"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildCanonicalAvatarUrl } from "@/lib/avatar/canonical-avatar-url";
import { useCurrentUserImage } from "@/lib/hooks/user/use-current-user-image";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { normalizeAvatarSeed } from "@/lib/avatar/branded-avatar";
import { resolveUserAvatarSeed } from "@/lib/user/avatar-preferences";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

import { DynamicAvatar } from "@/components/ui/dynamic-avatar";

interface UserAvatarProps extends React.ComponentProps<typeof Avatar> {
  fallback?: React.ReactNode;
  showFallbackIcon?: boolean;
  src?: string | null;
  walletAddress?: string | null;
}

export function UserAvatar({ 
  className, 
  fallback, 
  showFallbackIcon = true,
  src,
  walletAddress,
  ...props 
}: UserAvatarProps) {
  const hookAvatarUrl = useCurrentUserImage();
  const { data: profile } = useProfileAggregate();

  const identitySeed = profile?.identity?.avatarSeed ?? resolveUserAvatarSeed(profile?.identity);
  const seed =
    normalizeAvatarSeed({
      walletAddress,
      username: identitySeed,
    }) ?? identitySeed;
  const uploadedAvatarUrl = src ?? hookAvatarUrl;
  const generatedAvatarUrl = seed ? buildCanonicalAvatarUrl({ seed }) : null;
  const finalAvatarUrl = uploadedAvatarUrl ?? generatedAvatarUrl;
  const shouldRenderGeneratedAvatar = Boolean(seed) && !uploadedAvatarUrl;
  
  // Derive initials from existing profile data if available
  const initials = React.useMemo(() => {
    if (!profile?.identity) return "";
    const name = profile.identity.displayName || profile.identity.email || "";
    return name
      .slice(0, 2)
      .toUpperCase();
  }, [profile]);

  return (
    <Avatar className={cn("transition-opacity duration-200", className)} {...props}>
      {finalAvatarUrl ? <AvatarImage src={finalAvatarUrl} alt="User Avatar" /> : null}
      <AvatarFallback className="bg-transparent text-primary overflow-hidden p-0 m-0">
         {shouldRenderGeneratedAvatar && seed ? (
           <DynamicAvatar address={seed} size={32} className="w-full h-full" />
         ) : (
           fallback || (initials ? initials : showFallbackIcon ? <User className="size-4" /> : null)
         )}
      </AvatarFallback>
    </Avatar>
  );
}
