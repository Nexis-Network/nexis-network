import { Sandbox } from "@e2b/code-interpreter";

import type { SandboxSyncFileUpdate } from "./route.schema";

function getParentDirectory(path: string): string | null {
  const separatorIndex = path.lastIndexOf("/");
  if (separatorIndex <= 0) {
    return null;
  }

  return path.slice(0, separatorIndex);
}

export async function syncSandboxFiles(args: {
  e2bApiKey: string;
  files: SandboxSyncFileUpdate[];
  sandboxId: string;
}): Promise<void> {
  const sandbox = await Sandbox.connect(args.sandboxId, {
    apiKey: args.e2bApiKey,
  });

  for (const file of args.files) {
    if (file.content === undefined) {
      continue;
    }

    const directory = getParentDirectory(file.path);
    if (directory) {
      await sandbox.files.makeDir(directory);
    }

    await sandbox.files.write(file.path, file.content);
  }
}
