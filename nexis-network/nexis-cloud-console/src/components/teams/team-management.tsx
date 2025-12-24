"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCsrfToken } from "@/lib/csrf";

export type TeamRole = "admin" | "editor" | "viewer";

type TeamMember = {
  id: string;
  email: string;
  role: TeamRole;
  status: "active" | "invited";
  invitedAt: string;
  joinedAt: string | null;
};

type TeamRecord = {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
};

type TeamResponse = {
  team?: TeamRecord;
  viewer?: { id: string; role: TeamRole | null };
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function TeamManagement() {
  const [team, setTeam] = useState<TeamRecord | null>(null);
  const [viewerRole, setViewerRole] = useState<TeamRole | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [inviting, setInviting] = useState(false);

  const isAdmin = viewerRole === "admin";

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as TeamResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load team.");
      }
      setTeam(payload.team ?? null);
      setViewerRole(payload.viewer?.role ?? null);
      setViewerId(payload.viewer?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleInvite = async () => {
    setInviting(true);
    setError(null);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const payload = (await response.json().catch(() => ({}))) as TeamResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to invite member.");
      }
      setTeam(payload.team ?? null);
      setInviteEmail("");
      setInviteRole("viewer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to invite member.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, role: TeamRole) => {
    if (!team) return;
    setError(null);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/team/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ memberId: member.id, role }),
      });
      const payload = (await response.json().catch(() => ({}))) as TeamResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update role.");
      }
      setTeam(payload.team ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role.");
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!team) return;
    setError(null);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/team/member", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ memberId: member.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as TeamResponse;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to remove member.");
      }
      setTeam(payload.team ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove member.");
    }
  };

  const members = useMemo(() => team?.members ?? [], [team]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Team Management</h1>
        <p className="text-text-secondary mt-1">
          Invite collaborators and assign roles for the Nexis Cloud Console.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-text-secondary">Loading team...</div>
          ) : team ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-text-muted">
                  <tr className="border-b border-border-default">
                    <th className="py-2 pr-4">Member</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Invited</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-border-default/60">
                      <td className="py-2 pr-4 text-text-primary">
                        {member.email}
                        {viewerId === member.id && (
                          <span className="ml-2 text-xs text-accent-sky">(you)</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={member.role}
                          disabled={!isAdmin}
                          onChange={(event) =>
                            handleRoleChange(member, event.target.value as TeamRole)
                          }
                          className="h-9 rounded-md border border-border-default bg-background-surface px-2 text-sm text-text-secondary"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{member.status}</td>
                      <td className="py-2 pr-4 text-text-secondary">
                        {formatDate(member.invitedAt)}
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!isAdmin || member.id === viewerId}
                          onClick={() => handleRemove(member)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-text-secondary">No team data available.</div>
          )}
          {error && <div className="text-sm text-red-400">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label htmlFor="invite-email" className="sr-only">
              Invitee email
            </label>
            <Input
              id="invite-email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="person@company.com"
              disabled={!isAdmin}
            />
            <label htmlFor="invite-role" className="sr-only">
              Invitee role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as TeamRole)}
              className="h-10 rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
              disabled={!isAdmin}
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="button" onClick={handleInvite} isLoading={inviting} disabled={!isAdmin}>
              Send invite
            </Button>
          </div>
          {!isAdmin && (
            <div className="text-xs text-text-muted">Only admins can invite members.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
