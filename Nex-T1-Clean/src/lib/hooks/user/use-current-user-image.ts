import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";

export const useCurrentUserImage = () => {
  const { data: profile } = useProfileAggregate();
  return profile?.identity?.avatarUrl ?? null;
};
