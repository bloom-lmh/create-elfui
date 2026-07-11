import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TargetDirectoryNotEmptyError } from "./errors";
import {
  clearDirectoryPreservingGit,
  createStagingDirectory,
  inspectTargetDirectory,
  moveStagingDirectory,
  resolveProjectRoot
} from "./filesystem";
import { createPackageManifest } from "./manifest";
import type { ScaffoldOptions, StyleSolution } from "./options";
import { copyTemplate, renderTemplate, templatePath, type TemplateContext } from "./template";
import { dependencyVersions, type DependencyVersions } from "./versions";

export interface GenerateProjectOptions {
  templateRoot?: string;
  versions?: DependencyVersions;
}

export interface GenerateProjectResult {
  root: string;
  files: string[];
}

const getSourceExtension = (options: ScaffoldOptions): "ts" | "js" =>
  options.language === "ts" ? "ts" : "js";

const getStyleExtension = (style: StyleSolution): string | null =>
  style === "none" ? null : style;

const getTemplateContext = (options: ScaffoldOptions): TemplateContext => ({
  ...options,
  sourceExtension: getSourceExtension(options),
  isTypeScript: options.language === "ts",
  hasStyle: options.style !== "none",
  styleExtension: getStyleExtension(options.style),
  appTag: "elf-app"
});

export const listGeneratedFiles = (options: ScaffoldOptions): string[] => {
  const sourceExtension = getSourceExtension(options);
  const styleExtension = getStyleExtension(options.style);
  const files = [
    ".gitignore",
    "README.md",
    "index.html",
    "package.json",
    `vite.config.${sourceExtension}`,
    `src/main.${sourceExtension}`,
    `src/App.${sourceExtension}`
  ];

  if (options.language === "ts") files.push("tsconfig.json", "src/env.d.ts");
  if (styleExtension)
    files.push(`src/App.${styleExtension}`, `src/styles/global.${styleExtension}`);
  if (options.router) {
    files.push(
      `src/router/index.${sourceExtension}`,
      `src/pages/Home.${sourceExtension}`,
      `src/pages/About.${sourceExtension}`
    );
    if (styleExtension) files.push(`src/pages/page.${styleExtension}`);
  }
  if (options.vitest)
    files.push(`vitest.config.${sourceExtension}`, `src/__tests__/App.spec.${sourceExtension}`);
  if (options.eslint) files.push("eslint.config.js");
  if (options.prettier) files.push("prettier.config.js", ".prettierignore");

  return files.sort();
};

const writeProject = async (
  root: string,
  options: ScaffoldOptions,
  generationOptions: GenerateProjectOptions
): Promise<void> => {
  const context = getTemplateContext(options);
  const templateRoot = generationOptions.templateRoot;
  const sourceExtension = getSourceExtension(options);
  const styleExtension = getStyleExtension(options.style);
  const codeMode = options.componentMode;

  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify(createPackageManifest(options, generationOptions.versions ?? dependencyVersions), null, 2)}\n`,
    "utf8"
  );
  await copyTemplate(root, "common/_gitignore", ".gitignore", templateRoot);
  await renderTemplate(root, "common/README.md.ejs", "README.md", context, templateRoot);
  await renderTemplate(root, "common/index.html.ejs", "index.html", context, templateRoot);
  await renderTemplate(
    root,
    `code/${codeMode}/vite.config.ejs`,
    `vite.config.${sourceExtension}`,
    context,
    templateRoot
  );
  await renderTemplate(
    root,
    `code/${codeMode}/main.ejs`,
    `src/main.${sourceExtension}`,
    context,
    templateRoot
  );
  await renderTemplate(
    root,
    `code/${codeMode}/App.ejs`,
    `src/App.${sourceExtension}`,
    context,
    templateRoot
  );

  if (options.language === "ts") {
    await copyTemplate(root, "common/tsconfig.json", "tsconfig.json", templateRoot);
    await copyTemplate(root, "common/env.d.ts", "src/env.d.ts", templateRoot);
  }

  if (styleExtension) {
    await copyTemplate(
      root,
      templatePath("styles", styleExtension, `App.${styleExtension}`),
      `src/App.${styleExtension}`,
      templateRoot
    );
    await copyTemplate(
      root,
      templatePath("styles", styleExtension, `global.${styleExtension}`),
      `src/styles/global.${styleExtension}`,
      templateRoot
    );
  }

  if (options.router) {
    await renderTemplate(
      root,
      `code/${codeMode}/router.ejs`,
      `src/router/index.${sourceExtension}`,
      context,
      templateRoot
    );
    await renderTemplate(
      root,
      `code/${codeMode}/Home.ejs`,
      `src/pages/Home.${sourceExtension}`,
      context,
      templateRoot
    );
    await renderTemplate(
      root,
      `code/${codeMode}/About.ejs`,
      `src/pages/About.${sourceExtension}`,
      context,
      templateRoot
    );
    if (styleExtension) {
      await copyTemplate(
        root,
        templatePath("styles", styleExtension, `page.${styleExtension}`),
        `src/pages/page.${styleExtension}`,
        templateRoot
      );
    }
  }

  if (options.vitest) {
    await renderTemplate(
      root,
      "quality/vitest.config.ejs",
      `vitest.config.${sourceExtension}`,
      context,
      templateRoot
    );
    await renderTemplate(
      root,
      `quality/${codeMode}.spec.ejs`,
      `src/__tests__/App.spec.${sourceExtension}`,
      context,
      templateRoot
    );
  }

  if (options.eslint) {
    await renderTemplate(
      root,
      "quality/eslint.config.ejs",
      "eslint.config.js",
      context,
      templateRoot
    );
  }

  if (options.prettier) {
    await copyTemplate(root, "quality/prettier.config.js", "prettier.config.js", templateRoot);
    await copyTemplate(root, "quality/_prettierignore", ".prettierignore", templateRoot);
  }
};

export const generateProject = async (
  options: ScaffoldOptions,
  generationOptions: GenerateProjectOptions = {}
): Promise<GenerateProjectResult> => {
  const root = resolveProjectRoot(options.projectDir);
  const files = listGeneratedFiles(options);
  const targetState = await inspectTargetDirectory(root);

  if (targetState === "non-empty" && !options.force) {
    throw new TargetDirectoryNotEmptyError(root);
  }

  if (options.dryRun) return { root, files };

  let stagingDirectory: string | null = null;
  let writeRoot = root;

  try {
    if (targetState === "missing") {
      stagingDirectory = await createStagingDirectory(root);
      writeRoot = stagingDirectory;
    } else {
      if (targetState === "non-empty") await clearDirectoryPreservingGit(root);
      await mkdir(root, { recursive: true });
    }

    await writeProject(writeRoot, options, generationOptions);

    if (stagingDirectory) await moveStagingDirectory(stagingDirectory, root);
    return { root, files };
  } catch (error) {
    if (stagingDirectory) await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
};
