import "server-only";

export type V0File = {
  object: "file";
  name: string;
  content: string;
  locked: boolean;
};

export type V0Version = {
  id: string;
  object: "version";
  status: "pending" | "completed" | "failed";
  demoUrl?: string;
  screenshotUrl?: string;
  createdAt: string;
  updatedAt?: string;
  files?: V0File[];
};

export type V0Attachment = {
  url: string;
  name?: string;
  contentType?: string;
  size: number;
  content?: string;
  type?: "screenshot" | "figma" | "zip";
};

export type V0Message = {
  id: string;
  object: "message";
  content: string;
  experimental_content?: Array<unknown[]>;
  createdAt: string;
  updatedAt?: string;
  type:
    | "message"
    | "forked-block"
    | "forked-chat"
    | "open-in-v0"
    | "refinement"
    | "added-environment-variables"
    | "added-integration"
    | "deleted-file"
    | "moved-file"
    | "renamed-file"
    | "edited-file"
    | "replace-src"
    | "reverted-block"
    | "fix-with-v0"
    | "auto-fix-with-v0"
    | "sync-git"
    | "pull-changes"
    | "fix-cve"
    | "answered-questions"
    | "cloned-repo"
    | "manual-commit"
    | "design-mode";
  role: "user" | "assistant";
  finishReason?: "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other";
  apiUrl: string;
  authorId: string | null;
  parentId?: string | null;
  attachments?: V0Attachment[];
};

export type V0Chat = {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: "public" | "private" | "team" | "team-edit" | "unlisted";
  name?: string;
  title?: string;
  createdAt: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  projectId?: string;
  webUrl: string;
  apiUrl: string;
  latestVersion?: V0Version;
  messages: V0Message[];
  text: string;
  metadata: Record<string, unknown>;
};

export type V0Project = {
  id: string;
  object: "project";
  name: string;
  privacy: "private" | "team";
  vercelProjectId?: string;
  createdAt: string;
  updatedAt?: string;
  apiUrl: string;
  webUrl: string;
  description?: string;
  instructions?: string;
  chats: Array<{
    id: string;
    createdAt: string;
    updatedAt?: string;
    latestVersion?: V0Version;
  }>;
};

export type V0MessagesResponse = {
  object: "list";
  data: V0Message[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    nextUrl?: string;
  };
};
