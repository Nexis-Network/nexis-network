import { z } from "zod";

const ALLOWED_GIT_HOSTS = [
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "codeberg.org",
] as const;

const dangerousShellChars = /[;&|`$(){}[\]\\!#*?'"]/;

const gitUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }, "Only HTTPS URLs are allowed")
  .refine((url) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return ALLOWED_GIT_HOSTS.some(
        (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
      );
    } catch {
      return false;
    }
  }, `Only repositories from ${ALLOWED_GIT_HOSTS.join(", ")} are allowed`)
  .refine((url) => !dangerousShellChars.test(url), "URL contains invalid characters");

const npmPackageSchema = z
  .string()
  .min(1)
  .max(214)
  .refine((name) => /^(@[\w-]+\/)?[\w][\w.-]*(@[\w.^~>=<|-]+)?$/.test(name), {
    message: "Invalid npm package name format",
  })
  .refine((name) => !dangerousShellChars.test(name), {
    message: "Package name contains invalid characters",
  });

const filePathSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((path) => !path.includes(".."), "Path traversal not allowed")
  .refine((path) => !path.startsWith("/"), "Absolute paths not allowed")
  .refine((path) => !/[\x00-\x1f]/.test(path), "Path contains invalid characters");

const mcpServerSchema = z.union([
  z.object({
    mode: z.literal("registry"),
    name: z.string().min(1).max(64),
    registryId: z.string().uuid(),
  }),
  z.object({
    mode: z.literal("npm"),
    name: z.string().min(1).max(64),
    npmPackage: npmPackageSchema,
    runCommand: z.enum(["npx", "node", "tsx", "ts-node"]).default("npx").optional(),
    runArgs: z.array(z.string().max(200)).max(10).optional(),
  }),
]);

const fileInputSchema = z.object({
  path: filePathSchema,
  content: z.string().max(1024 * 1024),
});

export const sandboxRequestSchema = z.object({
  template: z
    .enum([
      "base",
      "web3",
      "dex",
      "uniswap",
      "nextjs-developer",
      "solidity-oz",
      "solana-rust",
    ])
    .default("base"),
  files: z.array(fileInputSchema).max(100).default([]),
  dependencies: z.array(npmPackageSchema).max(50).default([]),
  githubRepoUrl: gitUrlSchema.optional(),
  mcpServers: z.array(mcpServerSchema).max(10).default([]),
  enableDocker: z.boolean().default(false),
});

export type SandboxRequest = z.infer<typeof sandboxRequestSchema>;

export function parseSandboxRequest(body: unknown) {
  return sandboxRequestSchema.safeParse(body);
}

export function formatSandboxValidationIssues(error: z.ZodError<SandboxRequest>) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
