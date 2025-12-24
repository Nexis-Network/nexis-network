import "server-only";

import { promises as fs } from "fs";
import path from "path";

export type AgentTemplate = {
  slug: string;
  name: string;
  description: string;
  dockerCompose: string | null;
  readme: string | null;
};

const templatesRoot = path.resolve(
  process.cwd(),
  "..",
  "nexis-cloud",
  "templates",
  "prebuilt",
);

function isValidSlug(slug: string) {
  return /^[a-z0-9_-]+$/i.test(slug);
}

function titleFromSlug(slug: string) {
  return slug
    .split(/[-_]/g)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

function extractDescription(readme: string, fallback: string) {
  const lines = readme.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("![")) continue;
    if (trimmed.startsWith("```")) continue;
    return trimmed;
  }
  return fallback;
}

async function readFileIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function listTemplateSlugs() {
  try {
    const entries = await fs.readdir(templatesRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function getAgentTemplate(slug: string): Promise<AgentTemplate | null> {
  if (!isValidSlug(slug)) {
    return null;
  }
  const readmePath = path.join(templatesRoot, slug, "README.md");
  const composePath = path.join(templatesRoot, slug, "docker-compose.yml");
  const composeAltPath = path.join(templatesRoot, slug, "docker-compose.yaml");

  const [readme, dockerCompose, dockerComposeAlt] = await Promise.all([
    readFileIfExists(readmePath),
    readFileIfExists(composePath),
    readFileIfExists(composeAltPath),
  ]);

  if (!readme && !dockerCompose && !dockerComposeAlt) {
    return null;
  }

  const name = readme
    ? readme.split(/\r?\n/).find((line) => line.trim().startsWith("# "))?.replace(/^# /, "").trim()
    : null;

  const fallbackName = titleFromSlug(slug);
  const description = readme ? extractDescription(readme, fallbackName) : fallbackName;

  return {
    slug,
    name: name || fallbackName,
    description,
    dockerCompose: dockerCompose ?? dockerComposeAlt,
    readme,
  };
}

export async function getAgentTemplates(): Promise<AgentTemplate[]> {
  const slugs = await listTemplateSlugs();
  const templates = await Promise.all(slugs.map((slug) => getAgentTemplate(slug)));
  return templates.filter((template): template is AgentTemplate => Boolean(template));
}
