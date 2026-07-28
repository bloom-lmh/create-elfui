import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(packageRoot, "dist", "index.js");

const npmEnvironment = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !key.startsWith("npm_config_") &&
        !key.startsWith("npm_package_") &&
        !key.startsWith("npm_lifecycle_") &&
        key !== "npm_command",
    ),
  );

const consumerCases = [
  {
    packageManager: "pnpm",
    installArgs: ["install", "--ignore-scripts", "--prefer-offline"],
    verifyVersionMismatch: true,
  },
  {
    packageManager: "npm",
    installArgs: [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--prefer-offline",
      "--fetch-retries=5",
      "--fetch-retry-mintimeout=1000",
      "--fetch-retry-maxtimeout=10000",
    ],
  },
];

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: command === "npm" ? npmEnvironment() : process.env,
    shell:
      process.platform === "win32" && (command === "npm" || command === "pnpm"),
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}`,
    );
  }
};

const runExpectFailure = (command, args, cwd, expectedMessages) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: command === "npm" ? npmEnvironment() : process.env,
    shell:
      process.platform === "win32" && (command === "npm" || command === "pnpm"),
    timeout: 15_000,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

  if (result.error) throw result.error;
  if (result.status === 0) {
    throw new Error(`${command} ${args.join(" ")} unexpectedly succeeded.`);
  }
  if (!expectedMessages.some((message) => output.includes(message))) {
    throw new Error(
      `${command} ${args.join(" ")} failed without ${expectedMessages.join(" or ")}:\n${output}`,
    );
  }
};

const previousBetaVersion = (version) => {
  const match = /^(.*-beta\.)(\d+)$/.exec(version);
  if (!match || Number(match[2]) === 0) {
    throw new Error(`Cannot derive a mismatched beta from ${version}.`);
  }
  return `${match[1]}${Number(match[2]) - 1}`;
};

const runWithRetries = (command, args, cwd, attempts) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      run(command, args, cwd);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(
          `${command} install failed (attempt ${attempt}/${attempts}); retrying.`,
        );
      }
    }
  }
  throw lastError;
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
    runWithRetries(
      consumer.packageManager,
      consumer.installArgs,
      projectRoot,
      consumer.packageManager === "npm" ? 3 : 1,
    );
    if (consumer.verifyVersionMismatch) {
      const manifest = JSON.parse(
        readFileSync(join(projectRoot, "package.json"), "utf8"),
      );
      const coreVersion = manifest.dependencies["@elfui/core"];
      const vitePluginVersion = manifest.devDependencies["@elfui/vite-plugin"];
      const mismatchedVersion = previousBetaVersion(coreVersion);

      run(
        consumer.packageManager,
        [
          "add",
          `@elfui/core@${mismatchedVersion}`,
          "--ignore-scripts",
          "--prefer-offline",
        ],
        projectRoot,
      );
      runExpectFailure(
        consumer.packageManager,
        ["exec", "vite", "--host", "127.0.0.1", "--port", "0"],
        projectRoot,
        ["ELF_VITE_VERSION_MISMATCH", "ELF_VITE_PROTOCOL_MISMATCH"],
      );
      console.log(
        `Vite startup rejected @elfui/core ${mismatchedVersion} with @elfui/vite-plugin ${vitePluginVersion}.`,
      );
      run(
        consumer.packageManager,
        [
          "add",
          `@elfui/core@${coreVersion}`,
          "--ignore-scripts",
          "--prefer-offline",
        ],
        projectRoot,
      );
    }
    run(
      process.execPath,
      [cliPath, "generate", "component", "UserCard"],
      projectRoot,
    );
    run(process.execPath, [cliPath, "add", "github-actions"], projectRoot);
    run(consumer.packageManager, ["run", "typecheck"], projectRoot);
    run(consumer.packageManager, ["run", "test"], projectRoot);
    run(consumer.packageManager, ["run", "build"], projectRoot);

    if (!existsSync(join(projectRoot, "dist", "index.html"))) {
      throw new Error(
        `${consumer.packageManager} consumer did not produce dist/index.html.`,
      );
    }
  } finally {
    rmSync(temporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  }
}
