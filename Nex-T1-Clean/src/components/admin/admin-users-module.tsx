"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminSession } from "@/components/admin/admin-session-provider";
import { AdminUserDetailView } from "@/components/admin/admin-user-detail";
import type { AdminUserListResponse, AdminUserSummary } from "@/types/admin";


import { logger } from '@/lib/logger';
const PAGE_SIZE = 10;
const ROLE_OPTIONS = [
  { label: "All roles", value: "all" },
  { label: "Standard", value: "standard" },
  { label: "Admin", value: "admin" },
  { label: "Super Admin", value: "super_admin" },
];

export function AdminUsersModule() {
  const { status } = useAdminSession();
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, debouncedSearch]);

  const queryKey = useMemo(
    () => ["admin", "users", { page, role: roleFilter, search: debouncedSearch }],
    [page, roleFilter, debouncedSearch],
  );

  const listQuery = useQuery<AdminUserListResponse>({
    queryKey,
    enabled: Boolean(status?.authenticated),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (roleFilter !== "all") {
        params.set("role", roleFilter);
      }
      if (debouncedSearch) {
        params.set("q", debouncedSearch);
      }
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return (await res.json()) as AdminUserListResponse;
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, nextRole }: { userId: number; nextRole: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message = payload?.detail || "Unable to update role";
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / PAGE_SIZE)) : 1;

  if (listQuery.isError) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-regular">User Explorer</h2>
          <p className="text-sm text-destructive">Unable to load users. Please refresh the page.</p>
        </div>
        <Button onClick={() => listQuery.refetch()} variant="outline" size="sm">
          Retry
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-regular">User Explorer</h2>
          <p className="text-sm text-muted-foreground">
            Audit accounts, inspect sessions, and adjust elevated access in real time.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by email"
            className="md:w-64"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Wallets</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>Loading users…</TableCell>
              </TableRow>
            ) : listQuery.data?.results.length ? (
              listQuery.data.results.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  mutateRole={roleMutation.mutateAsync}
                  loading={roleMutation.isPending}
                  onInspect={(id) => {
                    setSelectedUserId(id);
                    setDetailOpen(true);
                  }}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No users match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || listQuery.isLoading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || listQuery.isLoading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
          </SheetHeader>
          <AdminUserDetailView userId={selectedUserId} open={detailOpen} />
        </SheetContent>
      </Sheet>
    </section>
  );
}

function UserRow({
  user,
  mutateRole,
  loading,
  onInspect,
}: {
  user: AdminUserSummary;
  mutateRole: (args: { userId: number; nextRole: string }) => Promise<UntypedJson>;
  loading: boolean;
  onInspect: (userId: number) => void;
}) {
  const [updatingRole, setUpdatingRole] = useState(false);

  const handleRoleChange = async (value: string) => {
    if (value === user.role) return;
    setUpdatingRole(true);
    try {
      await mutateRole({ userId: user.id, nextRole: value });
    } catch (error) {
      logger.error(error);
    } finally {
      setUpdatingRole(false);
    }
  };

  const lastSeen = user.last_session_at ? new Date(user.last_session_at).toLocaleString() : "—";
  const createdAt = new Date(user.created_at).toLocaleDateString();

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{user.email ?? `User #${user.id}`}</span>
          <span className="text-xs text-muted-foreground">Joined {createdAt}</span>
        </div>
      </TableCell>
      <TableCell>
        <Select defaultValue={user.role} onValueChange={handleRoleChange} disabled={loading || updatingRole}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{user.session_count}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </TableCell>
      <TableCell>{user.wallet_count}</TableCell>
      <TableCell>{lastSeen}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {user.has_active_subscription ? <Badge variant="secondary">Subscriber</Badge> : null}
          {user.is_blacklisted ? <Badge variant="destructive">Blacklisted</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm" onClick={() => onInspect(user.id)}>
          Details
        </Button>
      </TableCell>
    </TableRow>
  );
}
