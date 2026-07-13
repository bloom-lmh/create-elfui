import { outro } from "@clack/prompts";
import chalk from "chalk";
import { Argument, Command, Option } from "commander";
import { relative } from "node:path";

import { generateComponent } from "./component-generator";
import {
  addFeature,
  addableFeatures,
  type AddableFeature,
} from "./feature-adder";
import {
  InvalidOptionError,
  TargetDirectoryNotEmptyError,
  UserCancelledError,
} from "./errors";
import { inspectTargetDirectory, resolveProjectRoot } from "./filesystem";
import { generateProject } from "./generator";
import { initializeGitRepository } from "./git";
import {
  createScaffoldOptions,
  getPresetOverrides,
  isValidPackageName,
  routerModes,
  scaffoldPresets,
  scaffoldTemplates,
  styleSolutions,
  type ComponentMode,
  type Language,
  type RouterMode,
  type ScaffoldOptionOverrides,
  type ScaffoldPreset,
  type ScaffoldTemplate,
  type StyleSolution,
} from "./options";
import {
  getDevCommand,
  getInstallCommand,
  inferPackageManager,
  formatCommand,
  runInstall,
  type PackageManager,
} from "./package-manager";
import { confirmOverwrite, promptForOptions } from "./prompts";
import {
  deleteUserPreset,
  getUserPreset,
  listUserPresets,
  saveUserPreset,
  toUserPresetOverrides,
} from "./user-presets";

interface CliOptions {
  template?: ScaffoldTemplate;
  packageName?: string;
  listTemplates?: boolean;
  default?: boolean;
  preset?: ScaffoldPreset;
  usePreset?: string;
  savePreset?: string;
  listPresets?: boolean;
  deletePreset?: string;
  language?: Language;
  ts?: boolean;
  js?: boolean;
  component?: ComponentMode;
  macro?: boolean;
  chain?: boolean;
  style?: StyleSolution;
  router?: boolean;
  routerMode?: RouterMode;
  vitest?: boolean;
  playwright?: boolean;
  eslint?: boolean;
  prettier?: boolean;
  bare?: boolean;
  git?: boolean;
  githubActions?: boolean;
  packageManager?: PackageManager;
  force?: boolean;
  dryRun?: boolean;
}

interface GenerateComponentCliOptions {
  dir?: string;
  style?: StyleSolution;
  force?: boolean;
  dryRun?: boolean;
}

interface AddFeatureCliOptions {
  routerMode?: RouterMode;
  force?: boolean;
  dryRun?: boolean;
}

const featureFlags = [
  "--template",
  "--package-name",
  "--preset",
  "--use-preset",
  "--language",
  "--ts",
  "--js",
  "--component",
  "--macro",
  "--chain",
  "--style",
  "--router",
  "--router-mode",
  "--vitest",
  "--playwright",
  "--eslint",
  "--prettier",
  "--bare",
  "--github-actions",
] as const;

const hasFlag = (rawArgs: string[], flag: string): boolean =>
  rawArgs.some(
    (argument) => argument === flag || argument.startsWith(`${flag}=`),
  );

export const shouldPromptForFeatureSelection = (
  rawArgs: string[],
  defaultMode: boolean,
): boolean =>
  !defaultMode && !featureFlags.some((flag) => hasFlag(rawArgs, flag));

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

const resolveComponentMode = (
  options: CliOptions,
): ComponentMode | undefined => {
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
  installed: boolean,
): string[] => {
  const steps = [`cd ${formatDirectory(root)}`];
  if (!installed) steps.push(formatCommand(getInstallCommand(packageManager)));
  steps.push(formatCommand(getDevCommand(packageManager)));
  return steps;
};

const validateDefaultFlag = (rawArgs: string[], defaultMode: boolean): void => {
  if (!defaultMode) return;
  const changedFeature = featureFlags
    .filter((flag) => !["--template", "--package-name"].includes(flag))
    .find((flag) => hasFlag(rawArgs, flag));
  if (changedFeature) {
    throw new InvalidOptionError(
      `--default 不能与 ${changedFeature} 同时使用。`,
    );
  }
};

const validateNoInteractiveFlag = (
  directory: string | undefined,
  noInteractive: boolean,
): void => {
  if (noInteractive && !directory) {
    throw new InvalidOptionError("--no-interactive 必须同时提供项目目录。");
  }
};

const validatePresetSelection = (options: CliOptions): void => {
  if (options.preset && options.usePreset) {
    throw new InvalidOptionError("--preset 不能与 --use-preset 同时使用。");
  }
};

const validateTemplateCompatibility = (
  options: ReturnType<typeof createScaffoldOptions>,
): void => {
  if (options.template !== "library") return;
  const unsupportedFeature = [
    ["Router", options.router],
    ["Playwright", options.playwright],
    ["Bare", options.bare],
  ].find(([, enabled]) => enabled)?.[0];
  if (unsupportedFeature) {
    throw new InvalidOptionError(
      `组件库模板不支持 ${unsupportedFeature}；请移除对应选项后重试。`,
    );
  }
};

const validatePackageName = (
  options: ReturnType<typeof createScaffoldOptions>,
): void => {
  if (!isValidPackageName(options.packageName)) {
    throw new InvalidOptionError(
      `无效的 package name：${options.packageName}。请使用有效的 npm 包名。`,
    );
  }
};

const createInitialOptions = async (
  directory: string | undefined,
  options: CliOptions,
  rawArgs: string[],
): Promise<ReturnType<typeof createScaffoldOptions>> => {
  const packageManager = options.packageManager ?? inferPackageManager();
  const preset =
    options.preset ?? (options.default ? "recommended" : undefined);
  const savedOverrides = options.usePreset
    ? toUserPresetOverrides(await getUserPreset(options.usePreset))
    : {};
  const overrides: ScaffoldOptionOverrides = {
    ...(preset ? getPresetOverrides(preset) : {}),
    ...savedOverrides,
  };
  const language = resolveLanguage(options);
  const componentMode = resolveComponentMode(options);
  const install = getRequestedInstall(rawArgs);

  if (options.template) overrides.template = options.template;
  if (directory) overrides.projectDir = directory;
  if (options.packageName) overrides.packageName = options.packageName;
  if (language) overrides.language = language;
  if (componentMode) overrides.componentMode = componentMode;
  if (options.style) overrides.style = options.style;
  if (options.router) overrides.router = true;
  if (options.routerMode) {
    overrides.router = true;
    overrides.routerMode = options.routerMode;
  }
  if (options.vitest) overrides.vitest = true;
  if (options.playwright) overrides.playwright = true;
  if (options.eslint) overrides.eslint = true;
  if (options.prettier) overrides.prettier = true;
  if (options.bare) overrides.bare = true;
  if (hasFlag(rawArgs, "--no-git")) {
    overrides.git = false;
  }
  if (options.githubActions) overrides.githubActions = true;
  if (install !== undefined) overrides.install = install;
  if (options.force) overrides.force = true;
  if (options.dryRun) overrides.dryRun = true;

  return createScaffoldOptions(packageManager, overrides);
};

const runCreate = async (
  directory: string | undefined,
  options: CliOptions,
  rawArgs: string[],
) => {
  if (options.listTemplates) {
    console.log(
      JSON.stringify(
        [
          { name: "app", description: "ElfUI Vite application" },
          {
            name: "library",
            description: "Publishable ElfUI component library",
          },
        ],
        null,
        2,
      ),
    );
    return;
  }
  if (options.listPresets) {
    console.log(JSON.stringify(await listUserPresets(), null, 2));
    return;
  }
  if (options.deletePreset) {
    await deleteUserPreset(options.deletePreset);
    console.log(chalk.green(`已删除预设：${options.deletePreset}`));
    return;
  }

  const defaultMode = options.default === true;
  const noInteractive = hasFlag(rawArgs, "--no-interactive");
  validateDefaultFlag(rawArgs, defaultMode);
  validateNoInteractiveFlag(directory, noInteractive);
  validatePresetSelection(options);

  const interactiveFeatureSelection =
    !noInteractive && shouldPromptForFeatureSelection(rawArgs, defaultMode);
  const needsDirectoryPrompt = !directory && !noInteractive;
  const interactive = interactiveFeatureSelection || needsDirectoryPrompt;
  let scaffoldOptions = await createInitialOptions(directory, options, rawArgs);
  let promptedPresetName: string | undefined;

  if (interactive) {
    const promptResult = await promptForOptions(scaffoldOptions, {
      askProjectDirectory: needsDirectoryPrompt,
      askFeatures: interactiveFeatureSelection,
      askPackageName: interactiveFeatureSelection,
      askSavePreset: interactiveFeatureSelection && !options.savePreset,
      userPresets: Object.fromEntries(
        Object.entries(await listUserPresets()).map(([name, preset]) => [
          name,
          toUserPresetOverrides(preset),
        ]),
      ),
    });
    scaffoldOptions = promptResult.options;
    promptedPresetName = promptResult.savePresetName;
  }

  validateTemplateCompatibility(scaffoldOptions);
  validatePackageName(scaffoldOptions);

  const savePresetName = options.savePreset ?? promptedPresetName;
  if (savePresetName) {
    await saveUserPreset(savePresetName, scaffoldOptions);
    console.log(chalk.cyan(`已保存预设：${savePresetName}`));
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
    console.log(
      chalk.cyan(`正在使用 ${scaffoldOptions.packageManager} 安装依赖...`),
    );
    try {
      await runInstall(result.root, scaffoldOptions.packageManager);
    } catch (error) {
      const retry = formatCommand(
        getInstallCommand(scaffoldOptions.packageManager),
      );
      console.error(
        chalk.yellow(
          `依赖安装失败，项目文件已保留。进入项目后可重试：cd ${formatDirectory(result.root)} && ${retry}`,
        ),
      );
      throw error;
    }
  }

  if (scaffoldOptions.git) {
    try {
      await initializeGitRepository(result.root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(chalk.yellow(`Git 初始化失败，已保留项目文件：${message}`));
    }
  }

  const steps = createNextSteps(
    result.root,
    scaffoldOptions.packageManager,
    scaffoldOptions.install,
  );
  const message = `项目已创建：${result.root}\n\n${steps.map((step) => `  ${step}`).join("\n")}`;
  if (interactive) outro(message);
  else console.log(chalk.green(message));
};

const runGenerateComponent = async (
  name: string,
  options: GenerateComponentCliOptions,
): Promise<void> => {
  const result = await generateComponent({
    name,
    directory: options.dir,
    style: options.style,
    force: options.force,
    dryRun: options.dryRun,
  });

  if (options.dryRun) {
    console.log(chalk.cyan("将生成以下组件文件："));
  } else {
    console.log(chalk.green(`组件已生成：${result.componentName}`));
  }
  for (const file of result.files) console.log(`  ${file}`);
};

const runAddFeature = async (
  feature: AddableFeature,
  options: AddFeatureCliOptions,
): Promise<void> => {
  const result = await addFeature({
    feature,
    routerMode: options.routerMode,
    force: options.force,
    dryRun: options.dryRun,
  });

  if (result.alreadyAdded) {
    console.log(chalk.yellow(`功能已存在：${feature}`));
    return;
  }
  console.log(
    options.dryRun
      ? chalk.cyan(`将添加功能：${feature}`)
      : chalk.green(`功能已添加：${feature}`),
  );
  for (const file of result.files) console.log(`  ${file}`);
  if (!options.dryRun) {
    console.log(chalk.cyan("请运行包管理器 install 命令以安装新增依赖。"));
  }
};

export const createProgram = (rawArgs: string[]): Command => {
  const program = new Command();

  program
    .name("create-elfui")
    .description("创建一个新的 ElfUI Vite 项目")
    .argument("[directory]", "项目目录")
    .addOption(
      new Option("--template <template>", "选择项目模板").choices(
        scaffoldTemplates,
      ),
    )
    .option("--list-templates", "列出可用项目模板")
    .option("--package-name <name>", "设置 package.json 的包名")
    .option("--default", "使用推荐配置并跳过功能问答")
    .addOption(
      new Option("--preset <preset>", "使用项目预设").choices(scaffoldPresets),
    )
    .option("--use-preset <name>", "使用已保存的用户预设")
    .option("--save-preset <name>", "将当前选择保存为用户预设")
    .option("--list-presets", "列出已保存的用户预设")
    .option("--delete-preset <name>", "删除已保存的用户预设")
    .option("--no-interactive", "不进行交互；必须同时提供项目目录")
    .addOption(
      new Option("--language <language>", "选择语言").choices(["ts", "js"]),
    )
    .option("--ts", "--language ts 的别名")
    .option("--js", "--language js 的别名")
    .addOption(
      new Option("--component <component>", "选择组件模式").choices([
        "macro",
        "chain",
      ]),
    )
    .option("--macro", "--component macro 的别名")
    .option("--chain", "--component chain 的别名")
    .addOption(
      new Option("--style <style>", "选择样式方案").choices([
        "css",
        "scss",
        "less",
        "none",
      ]),
    )
    .option("--router", "加入 @elfui/router")
    .addOption(
      new Option("--router-mode <mode>", "选择 Router 模式").choices(
        routerModes,
      ),
    )
    .option("--vitest", "加入 Vitest")
    .option("--playwright", "加入 Playwright E2E 测试")
    .option("--eslint", "加入 ESLint")
    .option("--prettier", "加入 Prettier")
    .option("--bare", "生成最小项目，不生成教学示例")
    .option("--no-git", "不初始化 Git 仓库")
    .option("--github-actions", "生成 GitHub Actions CI 工作流")
    .addOption(
      new Option("--package-manager <name>", "选择包管理器").choices([
        "pnpm",
        "npm",
        "yarn",
        "bun",
      ]),
    )
    .option("--install", "生成后安装依赖")
    .option("--no-install", "生成后不安装依赖")
    .option("--force", "允许清理非空目标目录")
    .option("--dry-run", "输出配置和文件清单，不写磁盘")
    .helpOption("-h, --help", "显示帮助")
    .version("0.0.0", "-v, --version", "输出版本");

  program
    .command("generate")
    .description("在现有 ElfUI 项目中生成代码")
    .command("component <name>")
    .description("生成与当前项目模式匹配的组件")
    .option("--dir <path>", "组件目录，默认 src/components")
    .addOption(
      new Option("--style <style>", "覆盖自动识别的样式方案").choices(
        styleSolutions,
      ),
    )
    .option("--force", "覆盖同名生成文件")
    .option("--dry-run", "输出文件清单，不写磁盘")
    .action(async (name, options: GenerateComponentCliOptions) => {
      await runGenerateComponent(name, options);
    });

  program
    .command("add")
    .description("向现有 ElfUI 项目增量添加功能")
    .addArgument(new Argument("<feature>").choices(addableFeatures))
    .addOption(
      new Option("--router-mode <mode>", "Router 模式").choices(routerModes),
    )
    .option("--force", "覆盖脚手架管理的同名配置文件")
    .option("--dry-run", "输出变更清单，不写磁盘")
    .action(async (feature: AddableFeature, options: AddFeatureCliOptions) => {
      await runAddFeature(feature, options);
    });

  program.action(async (directory) => {
    await runCreate(
      directory as string | undefined,
      program.opts() as CliOptions,
      rawArgs,
    );
  });

  return program;
};

export const runCli = async (argv = process.argv): Promise<void> => {
  const rawArgs = argv.slice(2);
  await createProgram(rawArgs).parseAsync(argv);
};
