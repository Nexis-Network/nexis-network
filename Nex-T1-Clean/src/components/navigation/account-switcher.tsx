"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveAccount } from "@/hooks/user/use-active-account";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import { fetchUserOrganizations, type UserOrganization } from "@/lib/orgs/client";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export function AccountSwitcher() {
  const { accountId, setAccountId } = useActiveAccount();
  const { isAuthenticated, isSyncing } = useAuthContext();
  const { data } = useQuery<UserOrganization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      return fetchUserOrganizations({ accessToken: data.session?.access_token });
    },
    staleTime: 60_000,
    enabled: isAuthenticated && !isSyncing,
    initialData: [],
  });
  const orgs = useMemo(() => data ?? [], [data]);

  const [label, setLabel] = useState<string>("Workspace");
  const active = useMemo(() => orgs.find((o) => o.id === accountId) ?? null, [orgs, accountId]);

  useEffect(() => {
    setLabel(active?.name ?? (accountId ? accountId.slice(0, 8) : "Workspace"));
  }, [active?.name, accountId]);

  if (!isAuthenticated || orgs.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between rounded-md border border-border/40 px-3 py-2 text-sm">
          <span className="truncate max-w-[160px] text-left">{label}</span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs">Active workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} onSelect={() => setAccountId(org.id)} className="flex items-center gap-2">
            <span className="truncate">{org.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings/organization">Manage workspaces…</a>
        </DropdownMenuItem>
        {accountId ? (
          <DropdownMenuItem onSelect={() => setAccountId(null)}>
            Clear selection
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
