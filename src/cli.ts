import { outro } from "@clack/prompts";
import chalk from "chalk";
import { Command, Option } from "commander";
import { relative } from "node:path";

import { InvalidOptionError, TargetDirectoryNotEmptyError, UserCancelledError } from "./errors";
import { inspectTargetDirectory, resolveProjectRoot } from "./filesystem";
import { generateProject } from "./generator";
import {
  createScaffoldOptions,
  type ComponentMode,
  type Language,
  type ScaffoldOptionOverrides,
  type StyleSolution
} from "./options";
import {
  getDevCommand,
  getInstallCommand,
  inferPackageManager,
  formatCommand,
  runInstall,
  type PackageManager
} from "./package-manager";
import { confirmOverwrite, promptForOptions } from "./prompts";

interface CliOptions {
  default?: boolean;
  language?: Language;
  ts?: boolean;
  js?: boolean;
  component?: ComponentMode;
  macro?: boolean;
  chain?: boolean;
  style?: StyleSolution;
  router?: boolean;
  vitest?: boolean;
  eslint?: boolean;
  prettier?: boolean;
  bare?: boolean;
  packageManager?: PackageManager;
  force?: boolean;
  dryRun?: boolean;
}

const featureFlags = [
  "--language",
  "--ts",
  "--js",
  "--component",
  "--macro",
  "--chain",
  "--style",
  "--router",
  "--vitest",
  "--eslint",
  "--prettier",
  "--bare"
] as const;

const hasFlag = (rawArgs: string[], flag: string): boolean =>
  rawArgs.some((argument) => argument === flag || argument.startsWith(`${flag}=`));

const resolveLanguage = (options: CliOptions): Language | undefined => {
  if (options.ts && options.js) {
    throw new InvalidOptionError("--ts 与 --js 不能同时使用。");
  }
  if (options.language && options.ts && options.language !== "ts") {
    throw new InvalidOptionError("--language js 与 --ts 不能同时使用。");
  }
  if (options.language && options.js && options.language !== "js") {
    throw new InvalidOptionError("--language ts 与 --js 不能同时使用。");
  }
  if (options.ts) return "ts";
  if (options.js) return "js";
  return options.language;
};

const resolveComponentMode = (options: CliOptions): ComponentMode | undefined => {
  if (options.macro && options.chain) {
    throw new InvalidOptionError("--macro 与 --chain 不能同时使用。");
  }
  if (options.component && options.macro && options.component !== "macro") {
    throw new InvalidOptionError("--component chain 与 --macro 不能同时使用。");
  }
  if (options.component && options.chain && options.component !== "chain") {
    throw new InvalidOptionError("--component macro 与 --chain 不能同时使用。");
  }
  if (options.macro) return "macro";
  if (options.chain) return "chain";
  return options.component;
};

const getRequestedInstall = (rawArgs: string[]): boolean | undefined => {
  const install = hasFlag(rawArgs, "--install");
  const noInstall = hasFlag(rawArgs, "--no-install");
  if (install && noInstall)
    throw new InvalidOptionError("--install 与 --no-install 不能同时使用。");
  if (install) return true;
  if (noInstall) return false;
  return undefined;
};

const formatDirectory = (root: string): string => {
  const display = relative(process.cwd(), root) || ".";
  return display.includes(" ") ? `"${display}"` : display;
};

const createNextSteps = (
  root: string,
  packageManager: PackageManager,
  installed: boolean
): string[] => {
  const steps = [`cd ${formatDirectory(root)}`];
  if (!installed) steps.push(formatCommand(getInstallCommand(packageManager)));
  steps.push(formatCommand(getDevCommand(packageManager)));
  return steps;
};

const validateDefaultFlag = (rawArgs: string[], defaultMode: boolean): void => {
  if (!defaultMode) return;
  const changedFeature = featureFlags.find((flag) => hasFlag(rawArgs, flag));
  if (changedFeature) {
    throw new InvalidOptionError(`--default 不能与 ${changedFeature} 同时使用。`);
  }
};

const createInitialOptions = (
  directory: string | undefined,
  options: CliOptions,
  rawArgs: string[]
) => {
  const packageManager = options.packageManager ?? inferPackageManager();
  const overrides: ScaffoldOptionOverrides = {};
  const language = resolveLanguage(options);
  const componentMode = resolveComponentMode(options);
  const install = getRequestedInstall(rawArgs);

  if (directory) overrides.projectDir = directory;
  if (language) overrides.language = language;
  if (componentMode) overrides.componentMode = componentMode;
  if (options.style) overrides.style = options.style;
  if (options.router) overrides.router = true;
  if (options.vitest) overrides.vitest = true;
  if (options.eslint) overrides.eslint = true;
  if (options.prettier) overrides.prettier = true;
  if (options.bare) overrides.bare = true;
  if (install !== undefined) overrides.install = install;
  if (options.force) overrides.force = true;
  if (options.dryRun) overrides.dryRun = true;

  return createScaffoldOptions(packageManager, overrides);
};

const runCreate = async (directory: string | undefined, options: CliOptions, rawArgs: string[]) => {
  const defaultMode = options.default === true;
  validateDefaultFlag(rawArgs, defaultMode);

  const hasFeatureFlags = featureFlags.some((flag) => hasFlag(rawArgs, flag));
  const hasInstallFlag = hasFlag(rawArgs, "--install") || hasFlag(rawArgs, "--no-install");
  const interactiveFeatureSelection = !defaultMode && !hasFeatureFlags && !hasInstallFlag;
  const needsDirectoryPrompt = !directory;
  const interactive = interactiveFeatureSelection || needsDirectoryPrompt;
  let scaffoldOptions = createInitialOptions(directory, options, rawArgs);

  if (interactive) {
    scaffoldOptions = await promptForOptions(scaffoldOptions, {
      askProjectDirectory: needsDirectoryPrompt,
      askFeatures: interactiveFeatureSelection,
      askPackageName: interactiveFeatureSelection
    });
  }

  const root = resolveProjectRoot(scaffoldOptions.projectDir);
  if (!scaffoldOptions.dryRun && !scaffoldOptions.force) {
    const targetState = await inspectTargetDirectory(root);
    if (targetState === "non-empty") {
      if (!interactive) throw new TargetDirectoryNotEmptyError(root);
      const confirmed = await confirmOverwrite(root);
      if (!confirmed) throw new UserCancelledError();
      scaffoldOptions = { ...scaffoldOptions, force: true };
    }
  }

  const result = await generateProject(scaffoldOptions);

  if (scaffoldOptions.dryRun) {
    console.log(chalk.cyan("将使用以下配置："));
    console.log(JSON.stringify(scaffoldOptions, null, 2));
    console.log(chalk.cyan("将生成以下文件："));
    for (const file of result.files) console.log(`  ${file}`);
    return;
  }

  if (scaffoldOptions.install) {
    console.log(chalk.cyan(`正在使用 ${scaffoldOptions.packageManager} 安装依赖...`));
    try {
      await runInstall(result.root, scaffoldOptions.packageManager);
    } catch (error) {
      const retry = formatCommand(getInstallCommand(scaffoldOptions.packageManager));
      console.error(
        chalk.yellow(
          `依赖安装失败，项目文件已保留。进入项目后可重试：cd ${formatDirectory(result.root)} && ${retry}`
        )
      );
      throw error;
    }
  }

  const steps = createNextSteps(
    result.root,
    scaffoldOptions.packageManager,
    scaffoldOptions.install
  );
  const message = `项目已创建：${result.root}\n\n${steps.map((step) => `  ${step}`).join("\n")}`;
  if (interactive) outro(message);
  else console.log(chalk.green(message));
};

export const createProgram = (rawArgs: string[]): Command => {
  const program = new Command();

  program
    .name("create-elfui")
    .description("创建一个新的 ElfUI Vite 项目")
    .argument("[directory]", "项目目录")
    .option("--default", "使用默认配置并跳过功能问答")
    .addOption(new Option("--language <language>", "选择语言").choices(["ts", "js"]))
    .option("--ts", "--language ts 的别名")
    .option("--js", "--language js 的别名")
    .addOption(new Option("--component <component>", "选择组件模式").choices(["macro", "chain"]))
    .option("--macro", "--component macro 的别名")
    .option("--chain", "--component chain 的别名")
    .addOption(
      new Option("--style <style>", "选择样式方案").choices(["css", "scss", "less", "none"])
    )
    .option("--router", "加入 @elfui/router")
    .option("--vitest", "加入 Vitest")
    .option("--eslint", "加入 ESLint")
    .option("--prettier", "加入 Prettier")
    .option("--bare", "生成最小项目，不生成教学示例")
    .addOption(
      new Option("--package-manager <name>", "选择包管理器").choices(["pnpm", "npm", "yarn", "bun"])
    )
    .option("--install", "生成后安装依赖")
    .option("--no-install", "生成后不安装依赖")
    .option("--force", "允许清理非空目标目录")
    .option("--dry-run", "输出配置和文件清单，不写磁盘")
    .helpOption("-h, --help", "显示帮助")
    .version("0.0.0", "-v, --version", "输出版本");

  program.action(async (directory) => {
    await runCreate(directory as string | undefined, program.opts() as CliOptions, rawArgs);
  });

  return program;
};

export const runCli = async (argv = process.argv): Promise<void> => {
  const rawArgs = argv.slice(2);
  await createProgram(rawArgs).parseAsync(argv);
};
