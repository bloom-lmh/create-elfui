import { confirm, intro, isCancel, select, text } from "@clack/prompts";

import { UserCancelledError } from "./errors";
import {
  inferPackageName,
  isValidPackageName,
  toValidPackageName,
  type ScaffoldOptions
} from "./options";
import { packageManagers, type PackageManager } from "./package-manager";

export interface PromptOptions {
  askProjectDirectory: boolean;
  askFeatures: boolean;
  askPackageName: boolean;
}

const unwrapPrompt = <T>(value: T | symbol | undefined): T => {
  if (value === undefined || isCancel(value)) {
    throw new UserCancelledError();
  }
  return value as T;
};

const ask = async <T>(prompt: Promise<T | symbol | undefined>): Promise<T> =>
  unwrapPrompt(await prompt);

export const promptForOptions = async (
  initial: ScaffoldOptions,
  promptOptions: PromptOptions
): Promise<ScaffoldOptions> => {
  intro("创建 ElfUI 项目");

  let projectDir = initial.projectDir;
  if (promptOptions.askProjectDirectory) {
    projectDir = await ask(
      text({
        message: "项目目录",
        initialValue: projectDir,
        validate: (value) => (value?.trim() ? undefined : "项目目录不能为空。")
      })
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
        }
      })
    );
  }

  if (!promptOptions.askFeatures) return { ...initial, projectDir, packageName };

  const language = await ask(
    select({
      message: "开发语言",
      initialValue: initial.language,
      options: [
        { value: "ts", label: "TypeScript", hint: "推荐" },
        { value: "js", label: "JavaScript" }
      ]
    })
  );
  const componentMode = await ask(
    select({
      message: "组件模式",
      initialValue: initial.componentMode,
      options: [
        { value: "macro", label: "Macro", hint: "新项目主线，构建期编译" },
        { value: "chain", label: "Chain", hint: "旧站嵌入、小 demo、运行时模板" }
      ]
    })
  );
  const style = await ask(
    select({
      message: "样式方案",
      initialValue: initial.style,
      options: [
        { value: "css", label: "CSS" },
        { value: "scss", label: "Sass (SCSS)" },
        { value: "less", label: "Less" },
        { value: "none", label: "None" }
      ]
    })
  );
  const router = await ask(confirm({ message: "加入 Router？", initialValue: initial.router }));
  const vitest = await ask(
    confirm({ message: "加入 Vitest 单元测试？", initialValue: initial.vitest })
  );
  const eslint = await ask(confirm({ message: "加入 ESLint？", initialValue: initial.eslint }));
  const prettier = await ask(
    confirm({ message: "加入 Prettier？", initialValue: initial.prettier })
  );
  const bare = await ask(confirm({ message: "生成 Bare 最小项目？", initialValue: initial.bare }));
  const packageManager = await ask(
    select({
      message: "包管理器",
      initialValue: initial.packageManager,
      options: packageManagers.map((value) => ({ value, label: value }))
    })
  );
  const install = await ask(confirm({ message: "现在安装依赖？", initialValue: initial.install }));

  return {
    ...initial,
    projectDir,
    packageName,
    language: language as ScaffoldOptions["language"],
    componentMode: componentMode as ScaffoldOptions["componentMode"],
    style: style as ScaffoldOptions["style"],
    router,
    vitest,
    eslint,
    prettier,
    bare,
    packageManager: packageManager as PackageManager,
    install
  };
};

export const confirmOverwrite = async (target: string): Promise<boolean> =>
  ask(
    confirm({
      message: `目录 ${target} 不为空，是否清理其中内容后继续？`,
      initialValue: false
    })
  );
