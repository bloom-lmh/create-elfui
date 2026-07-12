import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(packageRoot, "dist", "index.js");

const run = (command, args, options = {}) =>
  new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolveRun();
      else
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`,
          ),
        );
    });
  });

const smokeCases = [
  {
    name: "macro-default",
    args: ["--default", "--no-install"],
    verify: async (projectRoot) => {
      const main = await readFile(join(projectRoot, "src", "main.ts"), "utf8");
      const viteConfig = await readFile(
        join(projectRoot, "vite.config.ts"),
        "utf8",
      );
      if (
        !main.includes('createApp(App).mount("#app")') ||
        !viteConfig.includes('macroImport: "@elfui/core"') ||
        !viteConfig.includes('runtimeImport: "@elfui/core"')
      ) {
        throw new Error("Macro 默认模板缺少 createApp 或 Vite 宏插件配置。");
      }
    },
  },
  {
    name: "chain-router",
    args: [
      "--component",
      "chain",
      "--router",
      "--style",
      "css",
      "--no-install",
    ],
    verify: async (projectRoot) => {
      const app = await readFile(join(projectRoot, "src", "App.ts"), "utf8");
      const router = await readFile(
        join(projectRoot, "src", "router", "index.ts"),
        "utf8",
      );
      if (
        !app.includes("ElfUI.createComponent()") ||
        !router.includes('mode: "hash"')
      ) {
        throw new Error("Chain Router 模板未生成预期的组件或 hash 路由配置。");
      }
    },
  },
  {
    name: "current-directory",
    args: ["--default", "--no-install"],
    currentDirectory: true,
    verify: async (projectRoot) => {
      const main = await readFile(join(projectRoot, "src", "main.ts"), "utf8");
      if (!main.includes('createApp(App).mount("#app")')) {
        throw new Error("当前目录生成未创建预期的 Macro 入口。");
      }
    },
  },
];

for (const smokeCase of smokeCases) {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), `create-elfui-${smokeCase.name}-`),
  );
  const projectRoot = smokeCase.currentDirectory
    ? temporaryRoot
    : join(temporaryRoot, "project");
  const targetDirectory = smokeCase.currentDirectory ? "." : projectRoot;

  try {
    await run(process.execPath, [cliPath, ...smokeCase.args, targetDirectory], {
      cwd: temporaryRoot,
    });
    await smokeCase.verify(projectRoot);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
