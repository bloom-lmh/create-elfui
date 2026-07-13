import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TargetDirectoryNotEmptyError } from "./errors";
import { assertFrameworkCompatibility } from "./framework-compatibility";
import {
  clearDirectoryPreservingGit,
  createStagingDirectory,
  inspectTargetDirectory,
  moveStagingDirectory,
  resolveProjectRoot,
} from "./filesystem";
import {
  createLibraryPackageManifest,
  createPackageManifest,
} from "./manifest";
import type { ScaffoldOptions, StyleSolution } from "./options";
import {
  copyTemplate,
  renderTemplate,
  templatePath,
  type TemplateContext,
} from "./template";
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
  appTag: "elf-app",
});

export const listGeneratedFiles = (options: ScaffoldOptions): string[] => {
  if (options.template === "library") {
    const sourceExtension = getSourceExtension(options);
    const styleExtension = getStyleExtension(options.style);
    const files = [
      ".gitignore",
      "README.md",
      "package.json",
      `vite.config.${sourceExtension}`,
      `src/ElfLibraryButton.${sourceExtension}`,
      `src/index.${sourceExtension}`,
    ];
    if (options.language === "ts") files.push("tsconfig.json", "src/env.d.ts");
    if (styleExtension) files.push(`src/ElfLibraryButton.${styleExtension}`);
    if (options.vitest)
      files.push(
        `vitest.config.${sourceExtension}`,
        `src/__tests__/ElfLibraryButton.spec.${sourceExtension}`,
      );
    if (options.githubActions) files.push(".github/workflows/ci.yml");
    if (options.eslint) files.push("eslint.config.js");
    if (options.prettier) files.push("prettier.config.js", ".prettierignore");
    return files.sort();
  }
  const sourceExtension = getSourceExtension(options);
  const styleExtension = getStyleExtension(options.style);
  const files = [
    ".gitignore",
    "README.md",
    "index.html",
    "package.json",
    `vite.config.${sourceExtension}`,
    "src/assets/elfui-mark.png",
    `src/main.${sourceExtension}`,
    `src/App.${sourceExtension}`,
  ];

  if (options.language === "ts") files.push("tsconfig.json", "src/env.d.ts");
  if (styleExtension)
    files.push(
      `src/App.${styleExtension}`,
      `src/styles/global.${styleExtension}`,
    );
  if (options.router) {
    files.push(
      `src/router/index.${sourceExtension}`,
      `src/pages/Home.${sourceExtension}`,
      `src/pages/About.${sourceExtension}`,
    );
    if (styleExtension) files.push(`src/pages/page.${styleExtension}`);
  }
  if (options.vitest)
    files.push(
      `vitest.config.${sourceExtension}`,
      `src/__tests__/App.spec.${sourceExtension}`,
    );
  if (options.playwright)
    files.push(
      `playwright.config.${sourceExtension}`,
      `e2e/app.spec.${sourceExtension}`,
    );
  if (options.githubActions) files.push(".github/workflows/ci.yml");
  if (options.eslint) files.push("eslint.config.js");
  if (options.prettier) files.push("prettier.config.js", ".prettierignore");

  return files.sort();
};

const writeProject = async (
  root: string,
  options: ScaffoldOptions,
  generationOptions: GenerateProjectOptions,
): Promise<void> => {
  const context = getTemplateContext(options);
  const templateRoot = generationOptions.templateRoot;
  const sourceExtension = getSourceExtension(options);
  const styleExtension = getStyleExtension(options.style);
  const codeMode = options.componentMode;

  await mkdir(root, { recursive: true });
  if (options.template === "library") {
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify(createLibraryPackageManifest(options, generationOptions.versions ?? dependencyVersions), null, 2)}\n`,
      "utf8",
    );
    await copyTemplate(root, "common/_gitignore", ".gitignore", templateRoot);
    await renderTemplate(
      root,
      "library/README.md.ejs",
      "README.md",
      context,
      templateRoot,
    );
    await renderTemplate(
      root,
      "library/vite.config.ejs",
      `vite.config.${sourceExtension}`,
      context,
      templateRoot,
    );
    await renderTemplate(
      root,
      "library/index.ejs",
      `src/index.${sourceExtension}`,
      context,
      templateRoot,
    );
    await renderTemplate(
      root,
      `library/${codeMode}.ejs`,
      `src/ElfLibraryButton.${sourceExtension}`,
      context,
      templateRoot,
    );
    if (options.language === "ts") {
      await copyTemplate(
        root,
        "library/tsconfig.json",
        "tsconfig.json",
        templateRoot,
      );
      await copyTemplate(root, "common/env.d.ts", "src/env.d.ts", templateRoot);
    }
    if (styleExtension) {
      await renderTemplate(
        root,
        "library/style.ejs",
        `src/ElfLibraryButton.${styleExtension}`,
        context,
        templateRoot,
      );
    }
    if (options.vitest) {
      await renderTemplate(
        root,
        "quality/vitest.config.ejs",
        `vitest.config.${sourceExtension}`,
        context,
        templateRoot,
      );
      await renderTemplate(
        root,
        "library/component.spec.ejs",
        `src/__tests__/ElfLibraryButton.spec.${sourceExtension}`,
        context,
        templateRoot,
      );
    }
    if (options.githubActions) {
      await renderTemplate(
        root,
        "quality/github-actions-ci.yml.ejs",
        ".github/workflows/ci.yml",
        context,
        templateRoot,
      );
    }
    if (options.eslint) {
      await renderTemplate(
        root,
        "quality/eslint.config.ejs",
        "eslint.config.js",
        context,
        templateRoot,
      );
    }
    if (options.prettier) {
      await copyTemplate(
        root,
        "quality/prettier.config.js",
        "prettier.config.js",
        templateRoot,
      );
      await copyTemplate(
        root,
        "quality/_prettierignore",
        ".prettierignore",
        templateRoot,
      );
    }
    return;
  }
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify(createPackageManifest(options, generationOptions.versions ?? dependencyVersions), null, 2)}\n`,
    "utf8",
  );
  await copyTemplate(root, "common/_gitignore", ".gitignore", templateRoot);
  await copyTemplate(
    root,
    "common/assets/elfui-mark.png",
    "src/assets/elfui-mark.png",
    templateRoot,
  );
  await renderTemplate(
    root,
    "common/README.md.ejs",
    "README.md",
    context,
    templateRoot,
  );
  await renderTemplate(
    root,
    "common/index.html.ejs",
    "index.html",
    context,
    templateRoot,
  );
  await renderTemplate(
    root,
    `code/${codeMode}/vite.config.ejs`,
    `vite.config.${sourceExtension}`,
    context,
    templateRoot,
  );
  await renderTemplate(
    root,
    `code/${codeMode}/main.ejs`,
    `src/main.${sourceExtension}`,
    context,
    templateRoot,
  );
  await renderTemplate(
    root,
    `code/${codeMode}/App.ejs`,
    `src/App.${sourceExtension}`,
    context,
    templateRoot,
  );

  if (options.language === "ts") {
    await copyTemplate(
      root,
      "common/tsconfig.json",
      "tsconfig.json",
      templateRoot,
    );
    await copyTemplate(root, "common/env.d.ts", "src/env.d.ts", templateRoot);
  }

  if (styleExtension) {
    await copyTemplate(
      root,
      templatePath("styles", styleExtension, `App.${styleExtension}`),
      `src/App.${styleExtension}`,
      templateRoot,
    );
    await copyTemplate(
      root,
      templatePath("styles", styleExtension, `global.${styleExtension}`),
      `src/styles/global.${styleExtension}`,
      templateRoot,
    );
  }

  if (options.router) {
    await renderTemplate(
      root,
      `code/${codeMode}/router.ejs`,
      `src/router/index.${sourceExtension}`,
      context,
      templateRoot,
    );
    await renderTemplate(
      root,
      `code/${codeMode}/Home.ejs`,
      `src/pages/Home.${sourceExtension}`,
      context,
      templateRoot,
    );
    await renderTemplate(
      root,
      `code/${codeMode}/About.ejs`,
      `src/pages/About.${sourceExtension}`,
      context,
      templateRoot,
    );
    if (styleExtension) {
      await copyTemplate(
        root,
        templatePath("styles", styleExtension, `page.${styleExtension}`),
        `src/pages/page.${styleExtension}`,
        templateRoot,
      );
    }
  }

  if (options.vitest) {
    await renderTemplate(
      root,
      "quality/vitest.config.ejs",
      `vitest.config.${sourceExtension}`,
      context,
      templateRoot,
    );
    await renderTemplate(
      root,
      `quality/${codeMode}.spec.ejs`,
      `src/__tests__/App.spec.${sourceExtension}`,
      context,
      templateRoot,
    );
  }

  if (options.playwright) {
    await renderTemplate(
      root,
      "quality/playwright.config.ejs",
      `playwright.config.${sourceExtension}`,
      context,
      templateRoot,
    );
    await renderTemplate(
      root,
      "quality/playwright.spec.ejs",
      `e2e/app.spec.${sourceExtension}`,
      context,
      templateRoot,
    );
  }

  if (options.githubActions) {
    await renderTemplate(
      root,
      "quality/github-actions-ci.yml.ejs",
      ".github/workflows/ci.yml",
      context,
      templateRoot,
    );
  }

  if (options.eslint) {
    await renderTemplate(
      root,
      "quality/eslint.config.ejs",
      "eslint.config.js",
      context,
      templateRoot,
    );
  }

  if (options.prettier) {
    await copyTemplate(
      root,
      "quality/prettier.config.js",
      "prettier.config.js",
      templateRoot,
    );
    await copyTemplate(
      root,
      "quality/_prettierignore",
      ".prettierignore",
      templateRoot,
    );
  }
};

export const generateProject = async (
  options: ScaffoldOptions,
  generationOptions: GenerateProjectOptions = {},
): Promise<GenerateProjectResult> => {
  assertFrameworkCompatibility(
    options,
    generationOptions.versions ?? dependencyVersions,
  );
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
    if (stagingDirectory)
      await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
};
