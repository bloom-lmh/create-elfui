import { spawn } from "node:child_process";

export const initializeGitRepository = async (cwd: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", ["init"], {
      cwd,
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git init 执行失败，退出码：${code ?? "unknown"}`));
    });
  });
};
