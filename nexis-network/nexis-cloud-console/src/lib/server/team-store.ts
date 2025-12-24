import "server-only";

import path from "path";
import { getDataPath, readJsonFile, writeJsonFile } from "@/lib/server/local-store";

export type TeamRole = "admin" | "editor" | "viewer";
export type TeamMemberStatus = "active" | "invited";

export type TeamMember = {
  id: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  invitedAt: string;
  joinedAt: string | null;
};

export type TeamRecord = {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
};

const STORE_PATH = path.join(getDataPath("teams"), "team.json");

async function readStore(): Promise<TeamRecord | null> {
  return readJsonFile<TeamRecord | null>(STORE_PATH, null);
}

async function writeStore(record: TeamRecord) {
  await writeJsonFile(STORE_PATH, record);
}

export async function getOrCreateTeam(owner: { id: string; email?: string | null }) {
  const existing = await readStore();
  if (existing) return existing;
  const now = new Date().toISOString();
  const ownerEmail = owner.email || "owner@nexis.local";
  const team: TeamRecord = {
    id: "default",
    name: "Nexis Cloud Team",
    members: [
      {
        id: owner.id,
        email: ownerEmail,
        role: "admin",
        status: "active",
        invitedAt: now,
        joinedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  await writeStore(team);
  return team;
}

export function getMemberRole(team: TeamRecord, memberId: string): TeamRole | null {
  const member = team.members.find((entry) => entry.id === memberId);
  return member?.role ?? null;
}

export async function updateTeam(team: TeamRecord) {
  const next = { ...team, updatedAt: new Date().toISOString() };
  await writeStore(next);
  return next;
}
