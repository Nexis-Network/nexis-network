import { Sandbox, SandboxOpts } from "@e2b/code-interpreter";


import { logger } from '@/lib/logger';
export class SandboxManager {
  private sandbox: Sandbox | null = null;
  private sandboxOptions: SandboxOpts;

  constructor(opts: SandboxOpts = {}) {
    this.sandboxOptions = opts;
  }

  async init() {
    if (this.sandbox) return this.sandbox;
    
    try {
      this.sandbox = await Sandbox.create(this.sandboxOptions);
      logger.debug("Sandbox created:", this.sandbox.sandboxId);
      return this.sandbox;
    } catch (error) {
      logger.error("Failed to create sandbox:", error);
      throw error;
    }
  }

  async destroy() {
    if (this.sandbox) {
      await this.sandbox.kill();
      this.sandbox = null;
    }
  }

  async writeFile(path: string, content: string) {
    if (!this.sandbox) throw new Error("Sandbox not initialized");
    // Ensure directory exists
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) {
        await this.sandbox.files.makeDir(dir); // Recursive is default true in recent SDKs usually, but check
    }
    await this.sandbox.files.write(path, content);
  }

  async readFile(path: string) {
    if (!this.sandbox) throw new Error("Sandbox not initialized");
    return await this.sandbox.files.read(path);
  }

  async runCommand(command: string) {
    if (!this.sandbox) throw new Error("Sandbox not initialized");
    return await this.sandbox.commands.run(command);
  }

  async installDependencies() {
      // Assuming a standard node project
      return this.runCommand("npm install");
  }

  async runDev() {
      return this.runCommand("npm run dev");
  }

  getSandboxUrl(port: number = 3000) {
      // E2B exposes ports via a specific URL pattern
      if (!this.sandbox) return null;
      return `https://${port}-${this.sandbox.sandboxId}.e2b.dev`; 
  }
}

export const sandboxManager = new SandboxManager();
