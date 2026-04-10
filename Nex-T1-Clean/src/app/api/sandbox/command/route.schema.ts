import { z } from "zod";

export const SandboxCommandSchema = z.object({
  sandboxId: z.string().min(1).max(128),
  command: z.string().min(1).max(4000),
  stream: z.boolean().optional().default(false),
});

const blockedCommandPatterns = [
  /\bsudo\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bpoweroff\b/i,
  /\bmkfs\b/i,
  /\bdd\b/i,
  /\bmount\b/i,
  /\bumount\b/i,
];

export function isBlockedSandboxCommand(command: string): boolean {
  if (/[\x00-\x08\x0e-\x1f]/.test(command)) {
    return true;
  }

  return blockedCommandPatterns.some((pattern) => pattern.test(command));
}
