import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";

export const useCurrentUserName = () => {
  const { data } = useProfileAggregate();
  return (
    data?.identity?.ensName ??
    data?.identity?.displayName ??
    data?.identity?.username ??
    data?.identity?.email ??
    "?"
  );
};
