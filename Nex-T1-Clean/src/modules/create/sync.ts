import "server-only";

import { v0Client } from "@/lib/v0/client";
import type { V0Chat, V0Project, V0Version } from "@/lib/v0/types";

import { buildCreateMessageRecord } from "./message-normalizer";
import { listCreateMessages, upsertCreateMessages } from "./message-repository";
import { getCreateProjectById, updateCreateProject } from "./project-repository";
import type { CreateMessageRecord, CreateProjectRecord } from "./types";

function getLatestChat(project: V0Project): { id: string } | null {
  const chats = [...project.chats].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return chats[0] ?? null;
}

async function resolveVersion(chat: V0Chat): Promise<V0Version | undefined> {
  const latestVersion = chat.latestVersion;
  if (!latestVersion?.id) {
    return latestVersion;
  }

  if (Array.isArray(latestVersion.files)) {
    return latestVersion;
  }

  return v0Client.getVersion(chat.id, latestVersion.id);
}

async function resolveChat(args: {
  providerChatId?: string | null;
  providerProjectId: string;
}): Promise<V0Chat | null> {
  if (args.providerChatId) {
    return v0Client.getChatById(args.providerChatId);
  }

  const project = await v0Client.getProjectById(args.providerProjectId);
  const latestChat = getLatestChat(project);
  if (!latestChat?.id) {
    return null;
  }

  return v0Client.getChatById(latestChat.id);
}

export async function syncCreateProjectFromV0(args: {
  localProjectId: string;
  providerProjectId: string;
  providerChatId?: string | null;
  streamMode: boolean;
}): Promise<{
  messages: CreateMessageRecord[];
  project: CreateProjectRecord;
}> {
  const chat = await resolveChat(args);
  const localProject = await getCreateProjectById(args.localProjectId);

  if (!localProject) {
    throw new Error("Create project not found during sync.");
  }

  if (!chat) {
    return {
      project: await updateCreateProject(args.localProjectId, {
        status: "pending",
      }),
      messages: [],
    };
  }

  const version = await resolveVersion(chat);
  const syncedProject = await updateCreateProject(args.localProjectId, {
    provider_chat_id: chat.id,
    provider_project_id: chat.projectId ?? args.providerProjectId,
    provider_version_id: version?.id ?? null,
    preview_url: version?.demoUrl ?? null,
    snapshot_files: (version?.files ?? []) as UntypedJson[],
    status: version?.status ?? "completed",
  });

  const providerMessages =
    chat.messages.length > 0 ? chat.messages : (await v0Client.findMessages(chat.id)).data;

  await upsertCreateMessages(
    providerMessages.map((message) =>
      buildCreateMessageRecord(syncedProject.id, message, args.streamMode),
    ),
  );

  return {
    project: syncedProject,
    messages: await listCreateMessages(syncedProject.id),
  };
}
