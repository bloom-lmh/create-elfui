import { access, mkdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

import { InvalidOptionError } from "./errors";
import { type StyleSolution } from "./options";
import { renderTemplate } from "./template";

type ComponentMode = "macro" | "chain";
type SourceExtension = "ts" | "js";

interface ProjectManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

interface ComponentProject {
  root: string;
  mode: ComponentMode;
  macroImport?: "@elfui/core" | "elfui";
  sourceExtension: SourceExtension;
  style: StyleSolution;
  vitest: boolean;
}

export interface GenerateComponentOptions {
  name: string;
  directory?: string;
  projectRoot?: string;
  style?: StyleSolution;
  force?: boolean;
  dryRun?: boolean;
}

export interface GenerateComponentResult {
  componentName: string;
  root: string;
  files: string[];
}

const componentNamePattern = /^[A-Za-z][A-Za-z0-9-]*$/;
const styles: StyleSolution[] = ["css", "scss", "less", "none"];

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const readManifest = async (root: string): Promise<ProjectManifest> => {
  const path = join(root, "package.json");
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch {
    throw new InvalidOptionError(`未找到项目 package.json：${path}`);
  }

  try {
    const manifest: unknown = JSON.parse(source);
    if (
      typeof manifest !== "object" ||
      manifest === null ||
      Array.isArray(manifest)
    ) {
      throw new Error("invalid manifest");
    }
    return manifest as ProjectManifest;
  } catch {
    throw new InvalidOptionError(`无法解析项目 package.json：${path}`);
  }
};

const normalizeComponentName = (input: string): string => {
  if (!componentNamePattern.test(input)) {
    throw new InvalidOptionError(
      "组件名只能包含字母、数字和连字符，且必须以字母开头。",
    );
  }

  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .split("-")
    .filter(Boolean)
    .map(
      (segment) =>
        `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1).toLowerCase()}`,
    )
    .join("");
};

const toKebabCase = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const resolveInsideProject = (root: string, path: string): string => {
  const resolved = resolve(root, path);
  const relativePath = relative(root, resolved);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    throw new InvalidOptionError(`组件目录必须位于项目内：${path}`);
  }
  return resolved;
};

const getDependencies = (
  manifest: ProjectManifest,
): Record<string, string> => ({
  ...manifest.dependencies,
  ...manifest.devDependencies,
});

const inferMode = (
  dependencies: Record<string, string>,
): Pick<ComponentProject, "mode" | "macroImport"> => {
  const hasChain = "@elfui/chain" in dependencies;
  const macroImport =
    "elfui" in dependencies
      ? "elfui"
      : "@elfui/core" in dependencies
        ? "@elfui/core"
        : undefined;

  if (hasChain && macroImport) {
    throw new InvalidOptionError(
      "项目同时声明了 Macro 和 Chain 依赖，无法自动判断组件模式。",
    );
  }
  if (hasChain) return { mode: "chain" };
  if (macroImport) return { mode: "macro", macroImport };

  throw new InvalidOptionError(
    "未检测到 ElfUI 依赖。请在由 create-elfui 创建的项目根目录执行此命令。",
  );
};

const inferSourceExtension = async (root: string): Promise<SourceExtension> =>
  (await fileExists(join(root, "tsconfig.json"))) ||
  (await fileExists(join(root, "src", "App.ts")))
    ? "ts"
    : "js";

const inferStyle = async (root: string): Promise<StyleSolution> => {
  for (const style of styles) {
    if (style === "none") continue;
    if (await fileExists(join(root, "src", `App.${style}`))) return style;
  }
  return "none";
};

const createProjectContext = async (
  root: string,
  requestedStyle: StyleSolution | undefined,
): Promise<ComponentProject> => {
  const manifest = await readManifest(root);
  const dependencies = getDependencies(manifest);
  const mode = inferMode(dependencies);

  return {
    root,
    ...mode,
    sourceExtension: await inferSourceExtension(root),
    style: requestedStyle ?? (await inferStyle(root)),
    vitest:
      "vitest" in dependencies ||
      manifest.scripts?.test?.includes("vitest") === true,
  };
};

const displayPath = (root: string, path: string): string =>
  relative(root, path).split(sep).join("/");

export const generateComponent = async (
  options: GenerateComponentOptions,
): Promise<GenerateComponentResult> => {
  const root = resolve(options.projectRoot ?? process.cwd());
  const componentName = normalizeComponentName(options.name);
  const project = await createProjectContext(root, options.style);
  const directory = resolveInsideProject(
    root,
    options.directory ?? "src/components",
  );
  const kebabName = toKebabCase(componentName);
  const sourcePath = join(
    directory,
    `${componentName}.${project.sourceExtension}`,
  );
  const stylePath =
    project.style === "none"
      ? undefined
      : join(directory, `${componentName}.${project.style}`);
  const testPath = project.vitest
    ? join(
        directory,
        "__tests__",
        `${componentName}.spec.${project.sourceExtension}`,
      )
    : undefined;
  const targets = [sourcePath, stylePath, testPath].filter(
    (path): path is string => Boolean(path),
  );
  const existing = await Promise.all(
    targets.map(async (path) => ((await fileExists(path)) ? path : undefined)),
  );
  const existingFiles = existing.filter((path): path is string =>
    Boolean(path),
  );

  if (existingFiles.length > 0 && !options.force) {
    throw new InvalidOptionError(
      `组件文件已存在：${existingFiles.map((path) => displayPath(root, path)).join(", ")}。使用 --force 覆盖。`,
    );
  }

  const result: GenerateComponentResult = {
    componentName,
    root,
    files: targets.map((path) => displayPath(root, path)).sort(),
  };
  if (options.dryRun) return result;

  await mkdir(directory, { recursive: true });
  const context = {
    componentName,
    kebabName,
    macroImport: project.macroImport,
    hasStyle: project.style !== "none",
    styleExtension: project.style,
  };
  await renderTemplate(
    root,
    `component/${project.mode}.ejs`,
    displayPath(root, sourcePath),
    context,
  );
  if (stylePath) {
    await renderTemplate(
      root,
      "component/style.ejs",
      displayPath(root, stylePath),
      context,
    );
  }
  if (testPath) {
    await renderTemplate(
      root,
      `component/${project.mode}.spec.ejs`,
      displayPath(root, testPath),
      context,
    );
  }

  return result;
};
