import {
  confirm,
  intro,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts";

import { UserCancelledError } from "./errors";
import {
  getPresetOverrides,
  inferPackageName,
  isValidPackageName,
  routerModes,
  scaffoldPresets,
  scaffoldTemplates,
  toValidPackageName,
  type ScaffoldOptionOverrides,
  type ScaffoldOptions,
} from "./options";
import { packageManagers, type PackageManager } from "./package-manager";
import { isValidPresetName } from "./user-presets";

export interface PromptOptions {
  askProjectDirectory: boolean;
  askFeatures: boolean;
  askPackageName: boolean;
  askSavePreset: boolean;
  userPresets?: Record<string, ScaffoldOptionOverrides>;
}

export interface PromptResult {
  options: ScaffoldOptions;
  savePresetName?: string;
  startDevServer?: boolean;
}

type OptionalFeature =
  | "router"
  | "vitest"
  | "playwright"
  | "eslint"
  | "prettier"
  | "bare"
  | "githubActions";

const unwrapPrompt = <T>(value: T | symbol | undefined): T => {
  if (value === undefined || isCancel(value)) {
    throw new UserCancelledError();
  }
  return value as T;
};

const ask = async <T>(prompt: Promise<T | symbol | undefined>): Promise<T> =>
  unwrapPrompt(await prompt);

const getInitialFeatures = (
  template: ScaffoldOptions["template"],
  options: ScaffoldOptions,
): OptionalFeature[] =>
  [
    ...(template === "app" && options.router ? ["router"] : []),
    ...(options.vitest ? ["vitest"] : []),
    ...(template === "app" && options.playwright ? ["playwright"] : []),
    ...(options.eslint ? ["eslint"] : []),
    ...(options.prettier ? ["prettier"] : []),
    ...(template === "app" && options.bare ? ["bare"] : []),
    ...(options.githubActions ? ["githubActions"] : []),
  ] as OptionalFeature[];

const getFeatureOptions = (
  template: ScaffoldOptions["template"],
): { value: OptionalFeature; label: string; hint: string }[] => [
  ...(template === "app"
    ? [{ value: "router" as const, label: "Router", hint: "页面路由" }]
    : []),
  { value: "vitest", label: "Vitest", hint: "单元测试" },
  ...(template === "app"
    ? [
        {
          value: "playwright" as const,
          label: "Playwright",
          hint: "E2E 测试",
        },
      ]
    : []),
  { value: "eslint", label: "ESLint", hint: "代码检查" },
  { value: "prettier", label: "Prettier", hint: "代码格式化" },
  ...(template === "app"
    ? [{ value: "bare" as const, label: "Bare", hint: "最小应用内容" }]
    : []),
  {
    value: "githubActions",
    label: "GitHub Actions",
    hint: "持续集成",
  },
];

export const promptForOptions = async (
  initial: ScaffoldOptions,
  promptOptions: PromptOptions,
): Promise<PromptResult> => {
  intro("创建 ElfUI 项目");

  let projectDir = initial.projectDir;
  if (promptOptions.askProjectDirectory) {
    projectDir = await ask(
      text({
        message: "项目目录",
        initialValue: projectDir,
        validate: (value) => (value?.trim() ? undefined : "项目目录不能为空。"),
      }),
    );
  }

  let packageName = inferPackageName(projectDir);
  if (promptOptions.askPackageName) {
    packageName = await ask(
      text({
        message: "package name",
        initialValue: packageName,
        validate: (value) => {
          const candidate = value ?? "";
          return isValidPackageName(candidate)
            ? undefined
            : `建议使用：${toValidPackageName(candidate)}`;
        },
      }),
    );
  }

  if (!promptOptions.askFeatures) {
    return { options: { ...initial, projectDir, packageName } };
  }

  const userPresets = promptOptions.userPresets ?? {};
  const presetSelection = await ask(
    select({
      message: "配置预设",
      initialValue: "recommended",
      options: [
        { value: "recommended", label: "推荐", hint: "ESLint + Prettier" },
        { value: "minimal", label: "Bare", hint: "最小应用骨架" },
        { value: "quality", label: "质量", hint: "ESLint + Prettier + Vitest" },
        { value: "custom", label: "自定义", hint: "从空配置开始" },
        ...Object.keys(userPresets).map((name) => ({
          value: `user:${name}`,
          label: name,
          hint: "用户预设",
        })),
      ],
    }),
  );
  const selectedOptions: ScaffoldOptionOverrides =
    presetSelection === "custom"
      ? {}
      : presetSelection.startsWith("user:")
        ? (userPresets[presetSelection.slice("user:".length)] ?? {})
        : getPresetOverrides(
            presetSelection as (typeof scaffoldPresets)[number],
          );
  const selectedInitial = { ...initial, ...selectedOptions };

  const template = await ask(
    select({
      message: "项目模板",
      initialValue: selectedInitial.template,
      options: scaffoldTemplates.map((value) => ({
        value,
        label: value === "app" ? "应用项目" : "组件库",
        ...(value === "app"
          ? { hint: "Vite 单页应用" }
          : { hint: "可发布的组件包" }),
      })),
    }),
  );
  const selectedTemplate = template as ScaffoldOptions["template"];
  const language = await ask(
    select({
      message: "开发语言",
      initialValue: selectedInitial.language,
      options: [
        { value: "ts", label: "TypeScript", hint: "推荐" },
        { value: "js", label: "JavaScript" },
      ],
    }),
  );
  const componentMode = await ask(
    select({
      message: "组件模式",
      initialValue: selectedInitial.componentMode,
      options: [
        { value: "macro", label: "Macro", hint: "新项目主线，构建期编译" },
        {
          value: "chain",
          label: "Chain",
          hint: "旧站嵌入、小 demo、运行时模板",
        },
      ],
    }),
  );
  const style = await ask(
    select({
      message: "样式方案",
      initialValue: selectedInitial.style,
      options: [
        { value: "css", label: "CSS" },
        { value: "scss", label: "Sass (SCSS)" },
        { value: "less", label: "Less" },
        { value: "none", label: "None" },
      ],
    }),
  );
  const optionalFeatures = await ask(
    multiselect({
      message: "可选功能",
      initialValues: getInitialFeatures(selectedTemplate, selectedInitial),
      options: getFeatureOptions(selectedTemplate),
    }),
  );
  const hasFeature = (feature: OptionalFeature): boolean =>
    optionalFeatures.includes(feature);
  const routerMode = hasFeature("router")
    ? await ask(
        select({
          message: "Router 模式",
          initialValue: selectedInitial.routerMode,
          options: routerModes.map((value) => ({
            value,
            label: value,
            ...(value === "hash" ? { hint: "适合静态部署" } : {}),
          })),
        }),
      )
    : selectedInitial.routerMode;
  const packageManager = await ask(
    select({
      message: "包管理器",
      initialValue: selectedInitial.packageManager,
      options: packageManagers.map((value) => ({ value, label: value })),
    }),
  );
  const git = await ask(
    confirm({
      message: "初始化 Git 仓库？",
      initialValue: selectedInitial.git,
    }),
  );
  const install = await ask(
    confirm({
      message: "现在安装依赖？",
      initialValue: selectedInitial.install,
    }),
  );

  const startDevServer =
    selectedTemplate === "app" && install
      ? await ask(
          confirm({
            message: "完成后启动开发服务器并打开浏览器？",
            initialValue: false,
          }),
        )
      : false;

  let savePresetName: string | undefined;
  if (promptOptions.askSavePreset) {
    const shouldSavePreset = await ask(
      confirm({ message: "保存为用户预设？", initialValue: false }),
    );
    if (shouldSavePreset) {
      savePresetName = await ask(
        text({
          message: "预设名称",
          placeholder: "work",
          validate: (value) =>
            isValidPresetName(value ?? "")
              ? undefined
              : "使用小写字母、数字和连字符，并以字母开头。",
        }),
      );
    }
  }

  return {
    options: {
      ...selectedInitial,
      projectDir,
      packageName,
      template: selectedTemplate,
      language: language as ScaffoldOptions["language"],
      componentMode: componentMode as ScaffoldOptions["componentMode"],
      style: style as ScaffoldOptions["style"],
      router: hasFeature("router"),
      routerMode: routerMode as ScaffoldOptions["routerMode"],
      vitest: hasFeature("vitest"),
      playwright: hasFeature("playwright"),
      eslint: hasFeature("eslint"),
      prettier: hasFeature("prettier"),
      bare: hasFeature("bare"),
      git,
      githubActions: hasFeature("githubActions"),
      packageManager: packageManager as PackageManager,
      install,
    },
    ...(savePresetName ? { savePresetName } : {}),
    ...(startDevServer ? { startDevServer } : {}),
  };
};

export const confirmOverwrite = async (target: string): Promise<boolean> =>
  ask(
    confirm({
      message: `目录 ${target} 不为空，是否清理其中内容后继续？`,
      initialValue: false,
    }),
  );
