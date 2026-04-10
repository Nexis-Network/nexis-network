import { logger } from "@/lib/logger";

export interface SandboxAuditLog {
  userId: string;
  orgId: string | null;
  action: "create" | "clone_repo" | "install_deps" | "write_files";
  sandboxId?: string;
  githubRepoUrl?: string;
  dependencies?: string[];
  fileCount?: number;
  timestamp: string;
  clientIp?: string;
}

export async function logSandboxAudit(log: SandboxAuditLog): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    logger.debug(JSON.stringify({ type: "sandbox_audit", ...log }));
    return;
  }

  logger.debug("[sandbox:audit]", log);
}
