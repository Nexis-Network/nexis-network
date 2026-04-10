import type { ZodIssue } from "zod";
import { envSchema, type Env } from "./env.schema";


import { logger } from '@/lib/logger';
export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue: ZodIssue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const report = { environment: raw.NODE_ENV ?? process.env.NODE_ENV ?? "unknown", issues };

    logger.error("env_validation_failed", report);

    const isProd = (raw.NODE_ENV ?? process.env.NODE_ENV) === "production";
    if (isProd) {
      throw new Error(`Invalid production environment configuration. Missing/invalid variables: ${issues
        .map((issue: { path: string; message: string }) => issue.path || issue.message)
        .join(", ")}`);
    }

    // In non-production, fall back to raw envs but surface issues for quick fixes.
    return raw as Env;
  }
  return parsed.data;
}
