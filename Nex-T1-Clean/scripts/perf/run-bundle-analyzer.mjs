import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_BUNDLE_ANALYZER: "1",
};

const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const subprocess = spawn(pnpmBin, ["run", "build"], {
  stdio: "inherit",
  env,
});

subprocess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
