import "server-only";

import { canAccessCreateProject } from "./access";
import { CreateServiceError } from "./errors";
import { normalizeCreateMessage } from "./message-normalizer";
import { listCreateMessages } from "./message-repository";
import {
  getCreateProjectById,
  listCreateProjectsForGuest,
  listCreateProjectsForUser,
} from "./project-repository";
import type {
  CreateMessageRecord,
  CreateNormalizedMessage,
  CreateProject,
  CreateProjectRecord,
  CreateWorkspace,
  ResolvedCreateActor,
} from "./types";

export function serializeCreateProject(record: CreateProjectRecord): CreateProject {
  return {
    id: record.id,
    templateId: record.template_id,
    chainFamily: record.chain_family,
    framework: record.framework,
    providerProjectId: record.provider_project_id,
    providerChatId: record.provider_chat_id,
    providerVersionId: record.provider_version_id,
    previewUrl: record.preview_url,
    snapshotFiles: record.snapshot_files,
    status: record.status,
    lastActivityAt: record.last_activity_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function serializeCreateMessages(records: CreateMessageRecord[]): CreateNormalizedMessage[] {
  return records.map(normalizeCreateMessage);
}

export async function loadCreateWorkspace(actor: ResolvedCreateActor) {
  const projects =
    actor.kind === "user"
      ? await listCreateProjectsForUser({ orgId: actor.orgId, userId: actor.userId })
      : actor.kind === "guest"
        ? await listCreateProjectsForGuest(actor.guestSessionId)
        : [];

  const claimableProjects =
    actor.kind === "user" && actor.guestSessionId
      ? await listCreateProjectsForGuest(actor.guestSessionId)
      : [];

  return {
    claimableProjects: claimableProjects
      .filter((project) => project.user_id === null)
      .map(serializeCreateProject),
    projects: projects.map(serializeCreateProject),
    viewer: actor.kind === "user"
      ? { kind: actor.kind, plan: actor.plan }
      : { kind: actor.kind },
  } satisfies CreateWorkspace;
}

export async function loadCreateProject(
  actor: ResolvedCreateActor,
  projectId: string,
) {
  const project = await getCreateProjectById(projectId);
  if (!project || !canAccessCreateProject(actor, project)) {
    throw new CreateServiceError({
      code: "NOT_FOUND",
      message: "Create project not found.",
      status: 404,
    });
  }

  return serializeCreateProject(project);
}

export async function loadCreateProjectMessages(
  actor: ResolvedCreateActor,
  projectId: string,
) {
  const project = await getCreateProjectById(projectId);
  if (!project || !canAccessCreateProject(actor, project)) {
    throw new CreateServiceError({
      code: "NOT_FOUND",
      message: "Create project not found.",
      status: 404,
    });
  }

  return serializeCreateMessages(await listCreateMessages(projectId));
}
