import { Sandbox } from "@e2b/code-interpreter";

type ConnectSandboxFilesArgs = {
  e2bApiKey: string;
  sandboxId: string;
};

async function connectSandboxFiles({
  e2bApiKey,
  sandboxId,
}: ConnectSandboxFilesArgs) {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: e2bApiKey });
  return sandbox.files;
}

export async function writeSandboxFile(args: {
  content: string;
  e2bApiKey: string;
  path: string;
  sandboxId: string;
}): Promise<void> {
  const files = await connectSandboxFiles(args);
  await files.write(args.path, args.content);
}

export async function readSandboxFile(args: {
  e2bApiKey: string;
  path: string;
  sandboxId: string;
}): Promise<string> {
  const files = await connectSandboxFiles(args);
  return files.read(args.path);
}

export async function listSandboxFiles(args: {
  e2bApiKey: string;
  path: string;
  sandboxId: string;
}): Promise<UntypedJson> {
  const files = await connectSandboxFiles(args);
  return files.list(args.path) as unknown as UntypedJson;
}
