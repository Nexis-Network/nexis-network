import { z } from "zod";

export const FilePathSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => !value.startsWith("/"), {
    message: "Absolute paths are not allowed",
  })
  .refine((value) => !value.includes(".."), {
    message: "Path traversal is not allowed",
  })
  .refine((value) => !/[\x00-\x1f]/.test(value), {
    message: "Path contains invalid characters",
  });

export const SandboxWriteFileSchema = z.object({
  sandboxId: z.string().min(1).max(128),
  path: FilePathSchema,
  content: z.string().max(1024 * 1024).optional(),
});

export const SandboxReadFilesQuerySchema = z.object({
  sandboxId: z.string().min(1).max(128),
  mode: z.enum(["list", "read"]).default("list"),
  path: FilePathSchema.default("."),
});
