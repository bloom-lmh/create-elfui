import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { InvalidOptionError } from "./errors";
import {
  type ComponentMode,
  type RouterMode,
  type StyleSolution,
} from "./options";
import { type PackageManager } from "./package-manager";
import { copyTemplate, renderTemplate } from "./template";
import { dependencyVersions } from "./versions";

export const addableFeatures = [
  "router",
  "vitest",
  "playwright",
  "eslint",
  "prettier",
  "github-actions",
] as const;

export type AddableFeature = (typeof addableFeatures)[number];

interface ProjectManifest {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface ProjectContext {
  root: string;
  manifest: ProjectManifest;
  componentMode: ComponentMode;
  sourceExtension: "ts" | "js";
  style: StyleSolution;
  packageManager: PackageManager;
}

export interface AddFeatureOptions {
  feature: AddableFeature;
  projectRoot?: string;
  routerMode?: RouterMode;
  force?: boolean;
  dryRun?: boolean;
}

export interface AddFeatureResult {
  feature: AddableFeature;
  files: string[];
  alreadyAdded: boolean;
}

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
  try {
    const manifest: unknown = JSON.parse(await readFile(path, "utf8"));
    if (
      typeof manifest !== "object" ||
      manifest === null ||
      Array.isArray(manifest)
    ) {
      throw new Error("invalid manifest");
    }
    return manifest as ProjectManifest;
  } catch {
    throw new InvalidOptionError(`无法读取项目 package.json：${path}`);
  }
};

const dependenciesOf = (manifest: ProjectManifest): Record<string, string> => ({
  ...manifest.dependencies,
  ...manifest.devDependencies,
});

const inferComponentMode = (manifest: ProjectManifest): ComponentMode => {
  const dependencies = dependenciesOf(manifest);
  const macro = "@elfui/core" in dependencies || "elfui" in dependencies;
  const chain = "@elfui/chain" in dependencies;
  if (macro === chain) {
    throw new InvalidOptionError(
      "无法自动判断 Macro 或 Chain 模式。请在由 create-elfui 创建的项目根目录执行。",
    );
  }
  return macro ? "macro" : "chain";
};

const inferStyle = async (root: string): Promise<StyleSolution> => {
  for (const style of ["css", "scss", "less"] as const) {
    if (await fileExists(join(root, "src", `App.${style}`))) return style;
  }
  return "none";
};

const inferPackageManager = async (root: string): Promise<PackageManager> => {
  if (await fileExists(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (await fileExists(join(root, "package-lock.json"))) return "npm";
  if (await fileExists(join(root, "yarn.lock"))) return "yarn";
  if (
    (await fileExists(join(root, "bun.lock"))) ||
    (await fileExists(join(root, "bun.lockb")))
  ) {
    return "bun";
  }
  return "pnpm";
};

const createContext = async (root: string): Promise<ProjectContext> => {
  const manifest = await readManifest(root);
  return {
    root,
    manifest,
    componentMode: inferComponentMode(manifest),
    sourceExtension:
      (await fileExists(join(root, "tsconfig.json"))) ||
      (await fileExists(join(root, "src", "App.ts")))
        ? "ts"
        : "js",
    style: await inferStyle(root),
    packageManager: await inferPackageManager(root),
  };
};

const sortObject = (entries: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(entries).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

const writeManifest = async (
  root: string,
  manifest: ProjectManifest,
): Promise<void> => {
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
};

const addDependencies = (
  manifest: ProjectManifest,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
  scripts: Record<string, string>,
): ProjectManifest => ({
  ...manifest,
  scripts: sortObject({ ...manifest.scripts, ...scripts }),
  dependencies: sortObject({ ...manifest.dependencies, ...dependencies }),
  devDependencies: sortObject({
    ...manifest.devDependencies,
    ...devDependencies,
  }),
});

const ensureWritable = async (
  root: string,
  files: string[],
  force: boolean | undefined,
): Promise<void> => {
  const existing = await Promise.all(
    files.map(async (file) =>
      (await fileExists(join(root, file))) ? file : undefined,
    ),
  );
  const conflicts = existing.filter((file): file is string => Boolean(file));
  if (conflicts.length > 0 && !force) {
    throw new InvalidOptionError(
      `以下文件已存在：${conflicts.join(", ")}。使用 --force 覆盖。`,
    );
  }
};

const isScaffoldApp = (source: string, mode: ComponentMode): boolean =>
  source.includes("ELFUI / WORKSPACE") ||
  (mode === "macro"
    ? source.includes("ElfUI + Vite") ||
      source.includes('class="app-shell"></main>')
    : source.includes("ElfUI + Vite") ||
      source.includes('`<main class="app-shell"></main>`'));

const hasFeature = async (
  context: ProjectContext,
  feature: AddableFeature,
): Promise<boolean> => {
  const dependencies = dependenciesOf(context.manifest);
  const extension = context.sourceExtension;
  switch (feature) {
    case "router":
      return (
        "@elfui/router" in dependencies &&
        (await fileExists(
          join(context.root, "src", "router", `index.${extension}`),
        ))
      );
    case "vitest":
      return (
        "vitest" in dependencies &&
        (await fileExists(join(context.root, `vitest.config.${extension}`)))
      );
    case "playwright":
      return (
        "@playwright/test" in dependencies &&
        (await fileExists(join(context.root, `playwright.config.${extension}`)))
      );
    case "eslint":
      return (
        "eslint" in dependencies &&
        (await fileExists(join(context.root, "eslint.config.js")))
      );
    case "prettier":
      return (
        "prettier" in dependencies &&
        (await fileExists(join(context.root, "prettier.config.js")))
      );
    case "github-actions":
      return await fileExists(
        join(context.root, ".github", "workflows", "ci.yml"),
      );
  }
};

export const addFeature = async (
  options: AddFeatureOptions,
): Promise<AddFeatureResult> => {
  const root = resolve(options.projectRoot ?? process.cwd());
  const context = await createContext(root);
  if (await hasFeature(context, options.feature)) {
    return { feature: options.feature, files: [], alreadyAdded: true };
  }

  const extension = context.sourceExtension;
  const styleExtension = context.style === "none" ? null : context.style;
  const templateContext = {
    componentMode: context.componentMode,
    sourceExtension: extension,
    language: extension === "ts" ? "ts" : "js",
    isTypeScript: extension === "ts",
    hasStyle: styleExtension !== null,
    styleExtension,
    router: true,
    routerMode: options.routerMode ?? "hash",
    bare: false,
    packageManager: context.packageManager,
    vitest:
      options.feature === "vitest" ||
      "vitest" in dependenciesOf(context.manifest),
    playwright:
      options.feature === "playwright" ||
      "@playwright/test" in dependenciesOf(context.manifest),
    eslint:
      options.feature === "eslint" ||
      "eslint" in dependenciesOf(context.manifest),
    prettier:
      options.feature === "prettier" ||
      "prettier" in dependenciesOf(context.manifest),
  };
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const scripts: Record<string, string> = {};
  const files: string[] = [];

  if (options.feature === "router") {
    const appPath = join(root, "src", `App.${extension}`);
    const app = await readFile(appPath, "utf8");
    if (!isScaffoldApp(app, context.componentMode) && !options.force) {
      throw new InvalidOptionError(
        "无法安全替换自定义 src/App。请手动接入 <elf-router-view>，或使用 --force 覆盖默认根组件。",
      );
    }
    const routerFiles = [
      `src/router/index.${extension}`,
      `src/pages/Home.${extension}`,
      `src/pages/About.${extension}`,
      ...(styleExtension ? [`src/pages/page.${styleExtension}`] : []),
    ];
    await ensureWritable(root, routerFiles, options.force);
    dependencies["@elfui/router"] = dependencyVersions.router;
    files.push(`src/App.${extension}`, `src/main.${extension}`, ...routerFiles);
    if (!options.dryRun) {
      await renderTemplate(
        root,
        `code/${context.componentMode}/App.ejs`,
        `src/App.${extension}`,
        templateContext,
      );
      const mainPath = join(root, "src", `main.${extension}`);
      const main = await readFile(mainPath, "utf8");
      if (!main.includes('import "./router"')) {
        await writeFile(mainPath, `import "./router";\n${main}`, "utf8");
      }
      await renderTemplate(
        root,
        `code/${context.componentMode}/router.ejs`,
        routerFiles[0],
        templateContext,
      );
      await renderTemplate(
        root,
        `code/${context.componentMode}/Home.ejs`,
        routerFiles[1],
        templateContext,
      );
      await renderTemplate(
        root,
        `code/${context.componentMode}/About.ejs`,
        routerFiles[2],
        templateContext,
      );
      if (styleExtension) {
        await copyTemplate(
          root,
          `styles/${styleExtension}/page.${styleExtension}`,
          routerFiles[3],
        );
      }
    }
  }

  if (options.feature === "vitest") {
    const featureFiles = [
      `vitest.config.${extension}`,
      `src/__tests__/App.spec.${extension}`,
    ];
    await ensureWritable(root, featureFiles, options.force);
    devDependencies.vitest = dependencyVersions.vitest;
    devDependencies.jsdom = dependencyVersions.jsdom;
    scripts.test = "vitest run";
    scripts["test:watch"] = "vitest";
    files.push(...featureFiles);
    if (!options.dryRun) {
      await renderTemplate(
        root,
        "quality/vitest.config.ejs",
        featureFiles[0],
        templateContext,
      );
      await renderTemplate(
        root,
        `quality/${context.componentMode}.spec.ejs`,
        featureFiles[1],
        templateContext,
      );
    }
  }

  if (options.feature === "playwright") {
    const featureFiles = [
      `playwright.config.${extension}`,
      `e2e/app.spec.${extension}`,
    ];
    await ensureWritable(root, featureFiles, options.force);
    devDependencies["@playwright/test"] = dependencyVersions.playwright;
    scripts["test:e2e"] = "playwright test";
    files.push(...featureFiles);
    if (!options.dryRun) {
      await renderTemplate(
        root,
        "quality/playwright.config.ejs",
        featureFiles[0],
        templateContext,
      );
      await renderTemplate(
        root,
        "quality/playwright.spec.ejs",
        featureFiles[1],
        templateContext,
      );
    }
  }

  if (options.feature === "eslint") {
    const featureFiles = ["eslint.config.js"];
    await ensureWritable(root, featureFiles, options.force);
    devDependencies.eslint = dependencyVersions.eslint;
    devDependencies["@eslint/js"] = dependencyVersions.eslintJs;
    devDependencies["typescript-eslint"] = dependencyVersions.typescriptEslint;
    if (templateContext.prettier) {
      devDependencies["eslint-config-prettier"] =
        dependencyVersions.eslintConfigPrettier;
    }
    scripts.lint = "eslint .";
    scripts["lint:fix"] = "eslint . --fix";
    files.push(...featureFiles);
    if (!options.dryRun) {
      await renderTemplate(
        root,
        "quality/eslint.config.ejs",
        featureFiles[0],
        templateContext,
      );
    }
  }

  if (options.feature === "prettier") {
    const featureFiles = ["prettier.config.js", ".prettierignore"];
    await ensureWritable(root, featureFiles, options.force);
    devDependencies.prettier = dependencyVersions.prettier;
    scripts.format = "prettier . --write";
    scripts["format:check"] = "prettier . --check";
    files.push(...featureFiles);
    if (!options.dryRun) {
      await copyTemplate(root, "quality/prettier.config.js", featureFiles[0]);
      await copyTemplate(root, "quality/_prettierignore", featureFiles[1]);
    }
  }

  if (options.feature === "github-actions") {
    const featureFiles = [".github/workflows/ci.yml"];
    await ensureWritable(root, featureFiles, options.force);
    files.push(...featureFiles);
    if (!options.dryRun) {
      await renderTemplate(
        root,
        "quality/github-actions-ci.yml.ejs",
        featureFiles[0],
        templateContext,
      );
    }
  }

  if (!options.dryRun) {
    await mkdir(root, { recursive: true });
    await writeManifest(
      root,
      addDependencies(context.manifest, dependencies, devDependencies, scripts),
    );
  }

  return {
    feature: options.feature,
    files: [...new Set(["package.json", ...files])].sort(),
    alreadyAdded: false,
  };
};
