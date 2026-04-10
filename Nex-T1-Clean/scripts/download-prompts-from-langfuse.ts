/**
 * Langfuse Prompt Download Script
 *
 * Domain: Scripts
 * Responsibility: Downloads all production prompts from Langfuse and stores them in `prompts/langfuse/`.
 * Notes: Run with `pnpm prompts:download`
 */

import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { Langfuse } from "langfuse";

const LANGFUSE_LABEL = (process.env.LANGFUSE_PROMPT_LABEL ?? "production").trim() || "production";
const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASEURL ?? process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

async function main() {
  console.log(`🚀 Starting prompt download from Langfuse (${LANGFUSE_BASE_URL})...`);
  console.log(`🏷️  Target label: ${LANGFUSE_LABEL}`);

  const outputDir = path.join(process.cwd(), "prompts", "langfuse");
  if (fs.existsSync(outputDir)) {
    console.log("🧹 Cleaning up old prompts...");
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // 1. Fetch all prompts (paginated)
    let page = 1;
    let allPromptNames: string[] = [];
    let hasMore = true;

    while (hasMore) {
        const auth = Buffer.from(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`).toString('base64');
        const response = await fetch(`${LANGFUSE_BASE_URL}/api/public/v2/prompts?page=${page}&limit=50`, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch prompts: ${response.statusText}`);
        }

        const data = await response.json() as unknown;
        const names = data.data.map((p: unknown) => p.name);
        allPromptNames = [...allPromptNames, ...names];
        
        hasMore = data.meta.page < data.meta.totalPages;
        page++;
    }

    console.log(`🔍 Found ${allPromptNames.length} prompts in project.`);

    // Helper to organize into folders
    const getSubfolder = (name: string): string | null => {
        const lower = name.toLowerCase();
        
        // Blocklist (Legacy/Unused)
        if (lower === 'system-prompt' || lower === 'system-prompt-v2') return null;

        // Agents
        if (lower.includes('nex-t1') || lower === 'nex.runtime.system' || lower.startsWith('nex.runtime.system_')) return 'agents/nex-t1';
        if (lower.includes('nex-coder')) return 'agents/nex-coder';
        if (lower.includes('degen')) return 'agents/degen';
        if (lower.includes('nex-t0')) return 'agents/nex-t0';
        
        // Common Runtime
        if (lower.startsWith('nex.runtime.') || lower.startsWith('chatbot-') || lower.includes('cache-safety')) return 'common/runtime';
        
        // Common Meta
        if (lower.startsWith('nex.meta.') || lower.startsWith('nex-meta-') || lower.endsWith('-spec') || lower.endsWith('-guide')) return 'common/meta';
        
        return 'misc';
    };

    // 2. Download each prompt
    for (const name of allPromptNames) {
      try {
        const subfolder = getSubfolder(name);
        if (!subfolder) {
            console.log(`🚫 Skipping legacy/ignored prompt: ${name}`);
            continue;
        }

        console.log(`⬇️  Downloading ${name}...`);
        const prompt = await langfuse.getPrompt(name, undefined, {
            label: LANGFUSE_LABEL,
        });

        const promptText = typeof prompt.prompt === 'string' 
            ? prompt.prompt 
            : JSON.stringify(prompt.prompt, null, 2);

        const folderPath = path.join(outputDir, subfolder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileName = `${name.replace(/\./g, "-")}.md`;
        const filePath = path.join(folderPath, fileName);

        const fileContent = `---
name: ${name}
version: ${prompt.version}
label: ${LANGFUSE_LABEL}
tags: ${JSON.stringify(prompt.tags || [])}
---

${promptText}
`;

        fs.writeFileSync(filePath, fileContent);
        console.log(`✅ Saved to prompts/langfuse/${subfolder}/${fileName}`);
      } catch (err) {
        console.error(`❌ Failed to download prompt "${name}":`, err instanceof Error ? err.message : err);
      }
    }

    console.log("\n✨ All prompts downloaded successfully!");
  } catch (error) {
    console.error("💥 Critical error:", error);
    process.exit(1);
  } finally {
    await langfuse.shutdownAsync();
  }
}

main();
