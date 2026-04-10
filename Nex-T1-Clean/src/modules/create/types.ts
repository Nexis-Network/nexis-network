export type CreateTemplateId = "wagmi-evm" | "web3js-evm" | "solana-web3js";
export type CreateChainFamily = "evm" | "solana";
export type CreateFramework = "wagmi" | "web3js" | "solana-web3js";
export type CreateProjectStatus = "pending" | "completed" | "failed";
export type CreateViewerKind = "anonymous" | "guest" | "user";

export type CreateTemplate = {
  id: CreateTemplateId;
  label: string;
  description: string;
  chainFamily: CreateChainFamily;
  framework: CreateFramework;
  starterPrompts: string[];
};

export type CreateCapability = {
  id: string;
  label: string;
  description: string;
};

export type CreateRenderablePart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "attachment";
      url: string;
      name?: string;
      contentType?: string;
    };

export type CreateNormalizedMessage = {
  id: string;
  providerMessageId: string;
  role: "user" | "assistant";
  createdAt: string;
  contentText: string;
  parts: CreateRenderablePart[];
};

export type CreateViewer =
  | {
      kind: "anonymous";
    }
  | {
      kind: "guest";
    }
  | {
      kind: "user";
      plan: string;
    };

export type CreateProject = {
  id: string;
  templateId: CreateTemplateId;
  chainFamily: CreateChainFamily;
  framework: CreateFramework;
  providerProjectId: string;
  providerChatId: string | null;
  providerVersionId: string | null;
  previewUrl: string | null;
  snapshotFiles: UntypedJson[];
  status: CreateProjectStatus;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspace = {
  claimableProjects: CreateProject[];
  projects: CreateProject[];
  viewer: CreateViewer;
};

export type CreateProjectRecord = {
  id: string;
  org_id: string | null;
  user_id: string | null;
  guest_session_id: string | null;
  template_id: CreateTemplateId;
  chain_family: CreateChainFamily;
  framework: CreateFramework;
  provider_project_id: string;
  provider_chat_id: string | null;
  provider_version_id: string | null;
  preview_url: string | null;
  snapshot_files: UntypedJson[];
  status: CreateProjectStatus;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

export type CreateMessageRecord = {
  id: string;
  project_id: string;
  provider_message_id: string;
  role: "user" | "assistant";
  content_raw: UntypedJson;
  content_text: string;
  stream_mode: boolean;
  created_at: string;
  updated_at: string;
};

export type ResolvedCreateActor =
  | {
      kind: "anonymous";
      ip: string;
      guestSessionId: null;
    }
  | {
      kind: "guest";
      ip: string;
      guestSessionId: string;
    }
  | {
      kind: "user";
      ip: string;
      userId: string;
      orgId: string;
      plan: string;
      guestSessionId: string | null;
    };
