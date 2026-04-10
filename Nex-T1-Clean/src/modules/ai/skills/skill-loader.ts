import fs from "fs/promises";
import os from "os";
import path from "path";


import { logger } from '@/lib/logger';
/**
 * Maps user intent categories to specific technical skill files.
 * These skills are injected into the system prompt to guide the AI.
 */
export const INTENT_SKILL_MAP: Record<string, string[]> = {
  // High-risk financial operations
  trading: ["evm-transaction-execution", "coinbase-agentkit", "solana-transaction-simulation", "solana-agent-kit"],
  defi: ["evm-transaction-execution", "coinbase-agentkit", "solana-transaction-simulation", "solana-agent-kit"],
  defi_swap: ["evm-transaction-execution", "coinbase-agentkit", "solana-transaction-simulation", "solana-agent-kit"],
  defi_yield: ["evm-transaction-execution", "coinbase-agentkit", "solana-agent-kit"],
  defi_liquidity: ["evm-transaction-execution", "coinbase-agentkit", "solana-agent-kit"],
  wallet_action: ["evm-transaction-execution", "coinbase-agentkit", "solana-transaction-simulation", "solana-agent-kit"],
  nft: ["coinbase-agentkit", "solana-agent-kit"],
  degen_trading: ["solana-transaction-simulation", "evm-transaction-execution", "coinbase-agentkit", "solana-agent-kit"],
};

// Base skills that are always loaded for certain complex tasks
const DEFAULT_SKILLS: string[] = [];

const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const SKILL_CACHE = new Map<string, { content: string; expiresAt: number }>();

const FALLBACK_SKILLS: Record<string, string> = {
  "evm-transaction-execution": "# EVM Transaction Execution\n\nExecute EVM transactions safely with simulation and guardrails.",
  "coinbase-agentkit": "# Coinbase AgentKit\n\nUse Coinbase AgentKit only for EVM chains and protocols. Prefer the domain-scoped coinbase_agentkit_wallet/defi/builder/identity/market tools, keep signing inside the user's CDP embedded EVM wallet, and do not route Solana requests through Coinbase AgentKit.",
  "solana-transaction-simulation": "# Solana Transaction Simulation\n\nSimulate Solana transactions before execution to validate outcomes.",
  "solana-agent-kit": "# Solana AgentKit\n\nUse Solana AgentKit domain-scoped tools and exact action names. Load only the relevant Solana protocol domain, require approvals for write actions, and keep signing inside the wallet provider boundary.",
};

function getSkillsDirectories(): string[] {
  const codeHome = process.env.CODEX_HOME?.trim();
  const home = os.homedir();

  return [
    path.resolve(process.cwd(), ".codex/skills"),
    path.resolve(process.cwd(), ".agents/skills"),
    codeHome ? path.resolve(codeHome, "skills") : "",
    path.resolve(home, ".codex/skills"),
    path.resolve(home, ".agents/skills"),
  ].filter((value) => value.length > 0);
}

async function resolveSkillFilePath(skill: string, skillsDirs: string[]): Promise<string | null> {
  for (const skillsDir of skillsDirs) {
    const candidates = [
      path.join(skillsDir, skill, "SKILL.md"),
      path.join(skillsDir, `skills.${skill}.md`),
      path.join(skillsDir, `${skill}.md`),
    ];

    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // continue searching
      }
    }
  }

  return null;
}

/**
 * Loads the content of specific skill files.
 * Returns a single concatenated string formatted with XML tags.
 */
export async function loadSkills(skillNames: string[]): Promise<string> {
  if (!skillNames || skillNames.length === 0) return "";

  const uniqueSkills = Array.from(new Set([...skillNames]));
  const skillsDirs = getSkillsDirectories();
  const loadedContent: string[] = [];

  for (const skill of uniqueSkills) {
    const cacheKey = `skill:${skill}`;
    const cached = SKILL_CACHE.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      loadedContent.push(cached.content);
      continue;
    }

    try {
      const filePath = await resolveSkillFilePath(skill, skillsDirs);
      if (!filePath) {
        const fallback = FALLBACK_SKILLS[skill];
        if (fallback) {
          const formatted = `<skill name="${skill}">\n${fallback}\n</skill>`;
          SKILL_CACHE.set(cacheKey, {
            content: formatted,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          loadedContent.push(formatted);
          continue;
        }
        logger.warn(`[SkillLoader] Skill '${skill}' not found in [${skillsDirs.join(", ")}]`);
        continue;
      }

      const content = await fs.readFile(filePath, "utf-8");
      const formatted = `<skill name="${skill}">\n${content}\n</skill>`;
      
      SKILL_CACHE.set(cacheKey, {
        content: formatted,
        expiresAt: Date.now() + CACHE_TTL_MS
      });
      
      loadedContent.push(formatted);
    } catch (error) {
      logger.warn(`[SkillLoader] Failed to load skill '${skill}':`, error);
      // Fail gracefully, don't crash the prompt assembly
    }
  }

  return loadedContent.join("\n\n");
}

/**
 * Determines which skills to load based on the intent classification.
 */
export function getSkillsForIntent(category: string): string[] {
  const specificHelperSkills = INTENT_SKILL_MAP[category] || [];
  
  // For high/medium complexity, always include base/consistency
  // For 'none' effort (greetings), we might skip this in the caller
  return Array.from(new Set([...DEFAULT_SKILLS, ...specificHelperSkills]));
}
