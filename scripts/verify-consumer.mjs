import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(packageRoot, "dist", "index.js");

const consumerCases = [
  {
    packageManager: "pnpm",
    installArgs: ["install", "--ignore-scripts"],
  },
  {
    packageManager: "npm",
    installArgs: ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
  },
];

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

if (!existsSync(cliPath))
  throw new Error("Missing bundled CLI. Run pnpm build first.");

for (const consumer of consumerCases) {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), `create-elfui-consumer-${consumer.packageManager}-`),
  );
  const projectRoot = join(temporaryRoot, "project");

  try {
    run(
      process.execPath,
      [
        cliPath,
        "--preset",
        "quality",
        "--router-mode",
        "history",
        "--playwright",
        "--package-manager",
        consumer.packageManager,
        "--no-install",
        projectRoot,
      ],
      packageRoot,
    );
    run(consumer.packageManager, consumer.installArgs, projectRoot);
    run(consumer.packageManager, ["run", "typecheck"], projectRoot);
    run(consumer.packageManager, ["run", "test"], projectRoot);
    run(consumer.packageManager, ["run", "build"], projectRoot);

    if (!existsSync(join(projectRoot, "dist", "index.html"))) {
      throw new Error(
        `${consumer.packageManager} consumer did not produce dist/index.html.`,
      );
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
