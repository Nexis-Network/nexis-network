import "server-only";

import { v0Client } from "@/lib/v0/client";
import { normalizeV0Error } from "@/lib/v0/errors";

import { canAccessCreateProject } from "./access";
import { CreateServiceError } from "./errors";
import { countActiveGuestProjects, getCreateProjectById, insertCreateProject, claimGuestCreateProject } from "./project-repository";
import { enforceCreateProjectQuota, enforceFollowUpQuota } from "./quota";
import { syncCreateProjectFromV0 } from "./sync";
import { getCreateTemplate } from "./template-catalog";
import { buildCreateSystemPrompt } from "./template-prompts";
import type { ResolvedCreateActor } from "./types";

type CreateMutableActor = Exclude<ResolvedCreateActor, { kind: "anonymous" }>;

function getProjectName(templateLabel: string, prompt: string): string {
  const stem = prompt.trim().split(/\s+/).slice(0, 6).join(" ");
  return stem.length > 0 ? `${templateLabel}: ${stem}`.slice(0, 80) : `${templateLabel} Project`;
}

export async function createCreateProject(args: {
  actor: CreateMutableActor;
  prompt: string;
  templateId: Parameters<typeof getCreateTemplate>[0];
}) {
  if (args.actor.kind === "guest") {
    const activeCount = await countActiveGuestProjects(args.actor.guestSessionId);
    if (activeCount >= 1) {
      throw new CreateServiceError({
        code: "GUEST_PROJECT_LIMIT_REACHED",
        message: "Guest sessions can only keep one active create project at a time.",
        status: 429,
      });
    }
  }

  const rateLimitHeaders = await enforceCreateProjectQuota(args.actor);
  const template = getCreateTemplate(args.templateId);

  try {
    const providerProject = await v0Client.createProject({
      name: getProjectName(template.label, args.prompt),
      description: template.description,
      instructions: buildCreateSystemPrompt(template),
    });

    const localProject = await insertCreateProject({
      org_id: args.actor.kind === "user" ? args.actor.orgId : null,
      user_id: args.actor.kind === "user" ? args.actor.userId : null,
      guest_session_id: args.actor.kind === "guest" ? args.actor.guestSessionId : null,
      template_id: template.id,
      chain_family: template.chainFamily,
      framework: template.framework,
      provider_project_id: providerProject.id,
      provider_chat_id: null,
      provider_version_id: null,
      preview_url: null,
      snapshot_files: [],
      status: "pending",
    });

    const chat = await v0Client.createChat({
      message: args.prompt,
      metadata: {
        chainFamily: template.chainFamily,
        framework: template.framework,
        templateId: template.id,
      },
      projectId: providerProject.id,
      system: buildCreateSystemPrompt(template),
    });

    return {
      rateLimitHeaders,
      ...(await syncCreateProjectFromV0({
        localProjectId: localProject.id,
        providerChatId: chat.id,
        providerProjectId: providerProject.id,
        streamMode: false,
      })),
    };
  } catch (error) {
    throw normalizeV0Error(error);
  }
}

export async function sendCreateMessage(args: {
  actor: CreateMutableActor;
  projectId: string;
  prompt: string;
}) {
  const project = await getCreateProjectById(args.projectId);
  if (!project || !canAccessCreateProject(args.actor, project)) {
    throw new CreateServiceError({
      code: "NOT_FOUND",
      message: "Create project not found.",
      status: 404,
    });
  }

  if (!project.provider_chat_id) {
    throw new CreateServiceError({
      code: "PROJECT_NOT_READY",
      message: "This create project does not have an active provider chat yet.",
      status: 409,
    });
  }

  const rateLimitHeaders = await enforceFollowUpQuota(args.actor);

  try {
    await v0Client.sendMessage({
      chatId: project.provider_chat_id,
      message: args.prompt,
    });

    return {
      rateLimitHeaders,
      ...(await syncCreateProjectFromV0({
        localProjectId: project.id,
        providerChatId: project.provider_chat_id,
        providerProjectId: project.provider_project_id,
        streamMode: false,
      })),
    };
  } catch (error) {
    throw normalizeV0Error(error);
  }
}

export async function claimCreateProject(args: {
  actor: Extract<ResolvedCreateActor, { kind: "user" }>;
  projectId: string;
}) {
  const project = await getCreateProjectById(args.projectId);
  if (!project || project.user_id) {
    throw new CreateServiceError({
      code: "NOT_FOUND",
      message: "Create project not found.",
      status: 404,
    });
  }

  if (!args.actor.guestSessionId || project.guest_session_id !== args.actor.guestSessionId) {
    throw new CreateServiceError({
      code: "FORBIDDEN",
      message: "This guest project cannot be claimed from the current session.",
      status: 403,
    });
  }

  return claimGuestCreateProject({
    orgId: args.actor.orgId,
    projectId: project.id,
    userId: args.actor.userId,
  });
}
