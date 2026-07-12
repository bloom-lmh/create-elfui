import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(packageRoot, "dist", "index.js");
const temporaryRoot = mkdtempSync(join(tmpdir(), "create-elfui-consumer-"));
const projectRoot = join(temporaryRoot, "project");

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell:
      process.platform === "win32" && (command === "npm" || command === "pnpm"),
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}`,
    );
  }
};

try {
  if (!existsSync(cliPath))
    throw new Error("Missing bundled CLI. Run pnpm build first.");

  run(
    process.execPath,
    [
      cliPath,
      "--preset",
      "quality",
      "--router-mode",
      "history",
      "--playwright",
      "--no-install",
      projectRoot,
    ],
    packageRoot,
  );
  run("pnpm", ["install", "--ignore-scripts"], projectRoot);
  run("pnpm", ["run", "typecheck"], projectRoot);
  run("pnpm", ["run", "test"], projectRoot);
  run("pnpm", ["run", "build"], projectRoot);

  if (!existsSync(join(projectRoot, "dist", "index.html"))) {
    throw new Error("Generated consumer did not produce dist/index.html.");
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
