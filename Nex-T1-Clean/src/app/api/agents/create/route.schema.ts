import { z } from "zod";

const AvatarUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (value.startsWith("orb:")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "avatarUrl must be an http(s) URL or an orb: preset.");

export const CreateSchema = z.object({
  orgId: z.string().uuid().optional(),
  slug: z.string().min(3),
  name: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(["public", "private", "unlisted"]).default("private"),
  systemPrompt: z.string().optional(),
  avatarUrl: AvatarUrlSchema.optional(),
  versionConfig: z.record(z.string(), z.any()),
  secrets: z.array(z.object({ key_name: z.string(), envelope: z.any() })).optional(),
  strategy: z
    .object({
      blocklyXml: z.string().min(10),
      templateId: z.string().optional(),
    })
    .optional(),
});
