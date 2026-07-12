import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { TargetDirectoryNotEmptyError } from "../src/errors";
import { generateProject, listGeneratedFiles } from "../src/generator";
import { createScaffoldOptions } from "../src/options";

describe("generateProject", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "create-elfui-"));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("generates the TypeScript Macro default with createApp and the Vite plugin", async () => {
    const projectDir = join(temporaryDirectory, "macro-app");
    await generateProject(createScaffoldOptions("pnpm", { projectDir }));

    const main = await readFile(join(projectDir, "src", "main.ts"), "utf8");
    const viteConfig = await readFile(
      join(projectDir, "vite.config.ts"),
      "utf8",
    );
    const manifest = JSON.parse(
      await readFile(join(projectDir, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(main).toContain('createApp(App).mount("#app")');
    expect(viteConfig).toContain('macroImport: "@elfui/core"');
    expect(viteConfig).toContain('runtimeImport: "@elfui/core"');
    expect(manifest.dependencies).toHaveProperty("@elfui/core");
    expect(manifest.dependencies).toHaveProperty("@elfui/runtime");
    expect(manifest.devDependencies).toHaveProperty("@elfui/vite-plugin");
    expect(manifest.dependencies).not.toHaveProperty("@elfui/chain");
    await access(join(projectDir, ".gitignore"));
  });

  it("generates Chain, Router and Less without adding the Macro plugin", async () => {
    const projectDir = join(temporaryDirectory, "chain-app");
    await generateProject(
      createScaffoldOptions("npm", {
        projectDir,
        language: "js",
        componentMode: "chain",
        style: "less",
        router: true,
        vitest: true,
      }),
    );

    const indexHtml = await readFile(join(projectDir, "index.html"), "utf8");
    const app = await readFile(join(projectDir, "src", "App.js"), "utf8");
    const manifest = JSON.parse(
      await readFile(join(projectDir, "package.json"), "utf8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(indexHtml).toContain("<elf-app></elf-app>");
    expect(app).toContain("ElfUI.createComponent()");
    expect(app).toContain(".style(styles)");
    expect(manifest.dependencies).toHaveProperty("@elfui/chain");
    expect(manifest.dependencies).toHaveProperty("@elfui/router");
    expect(manifest.devDependencies).toHaveProperty("less");
    expect(manifest.devDependencies).not.toHaveProperty("@elfui/vite-plugin");
    await access(join(projectDir, "src", "router", "index.js"));
    await access(join(projectDir, "src", "App.less"));
    await access(join(projectDir, "src", "pages", "page.less"));
    expect(
      await readFile(join(projectDir, "src", "pages", "Home.js"), "utf8"),
    ).toContain(".style(styles)");
  });

  it("renders the selected history Router mode and its deployment note", async () => {
    const projectDir = join(temporaryDirectory, "history-router-app");
    await generateProject(
      createScaffoldOptions("pnpm", {
        projectDir,
        router: true,
        routerMode: "history",
      }),
    );

    const router = await readFile(
      join(projectDir, "src", "router", "index.ts"),
      "utf8",
    );
    const readme = await readFile(join(projectDir, "README.md"), "utf8");

    expect(router).toContain('mode: "history"');
    expect(readme).toContain("未知路径回退到 `index.html`");
  });

  it("renders every language, component, style and Router combination", async () => {
    for (const language of ["ts", "js"] as const) {
      for (const componentMode of ["macro", "chain"] as const) {
        for (const style of ["css", "scss", "less", "none"] as const) {
          for (const router of [false, true]) {
            const projectDir = join(
              temporaryDirectory,
              `${language}-${componentMode}-${style}-${router ? "router" : "plain"}`,
            );
            const options = createScaffoldOptions("pnpm", {
              projectDir,
              language,
              componentMode,
              style,
              router,
            });
            const result = await generateProject(options);
            const manifest = JSON.parse(
              await readFile(join(projectDir, "package.json"), "utf8"),
            ) as {
              dependencies: Record<string, string>;
              devDependencies: Record<string, string>;
            };

            expect(result.files.every((file) => !file.endsWith(".ejs"))).toBe(
              true,
            );
            const generatedContents = await Promise.all(
              result.files.map((file) =>
                readFile(join(projectDir, file), "utf8"),
              ),
            );
            expect(generatedContents.join("\n")).not.toMatch(/<%[-=#]?|%>/);
            expect(result.files).toContain(`src/App.${language}`);
            expect(result.files.includes(`src/App.${style}`)).toBe(
              style !== "none",
            );
            expect(result.files.includes(`src/router/index.${language}`)).toBe(
              router,
            );
            expect(result.files.includes(`src/pages/page.${style}`)).toBe(
              router && style !== "none",
            );
            expect(manifest.dependencies).toHaveProperty(
              componentMode === "macro" ? "@elfui/core" : "@elfui/chain",
            );
            expect(manifest.devDependencies).toHaveProperty("vite");
            if (componentMode === "macro") {
              expect(manifest.dependencies).toHaveProperty("@elfui/runtime");
              expect(manifest.devDependencies).toHaveProperty(
                "@elfui/vite-plugin",
                "^0.1.0-beta.1",
              );
            } else {
              expect(manifest.dependencies).not.toHaveProperty(
                "@elfui/runtime",
              );
              expect(manifest.devDependencies).not.toHaveProperty(
                "@elfui/vite-plugin",
              );
            }
            if (router && style !== "none") {
              expect(generatedContents.join("\n")).toContain(
                componentMode === "macro"
                  ? "defineStyle(styles)"
                  : ".style(styles)",
              );
            }
          }
        }
      }
    }
  });

  it("renders ESLint and Prettier overlays when selected", async () => {
    const projectDir = join(temporaryDirectory, "quality-app");
    await generateProject(
      createScaffoldOptions("pnpm", {
        projectDir,
        eslint: true,
        prettier: true,
      }),
    );

    const eslintConfig = await readFile(
      join(projectDir, "eslint.config.js"),
      "utf8",
    );
    await access(join(projectDir, "prettier.config.js"));
    await access(join(projectDir, ".prettierignore"));
    expect(eslintConfig).toContain("eslintConfigPrettier");
  });

  it("renders Playwright configuration and its first browser test", async () => {
    const projectDir = join(temporaryDirectory, "playwright-app");
    await generateProject(
      createScaffoldOptions("pnpm", { projectDir, playwright: true }),
    );

    const playwrightConfig = await readFile(
      join(projectDir, "playwright.config.ts"),
      "utf8",
    );
    const browserTest = await readFile(
      join(projectDir, "e2e", "app.spec.ts"),
      "utf8",
    );
    const manifest = JSON.parse(
      await readFile(join(projectDir, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(playwrightConfig).toContain("127.0.0.1:4173");
    expect(browserTest).toContain('page.goto("/")');
    expect(manifest.scripts).toHaveProperty("test:e2e", "playwright test");
  });

  it("configures the Macro compiler for @elfui/core in Vitest projects", async () => {
    const projectDir = join(temporaryDirectory, "macro-vitest-app");
    await generateProject(
      createScaffoldOptions("pnpm", {
        projectDir,
        vitest: true,
      }),
    );

    const vitestConfig = await readFile(
      join(projectDir, "vitest.config.ts"),
      "utf8",
    );

    expect(vitestConfig).toContain('macroImport: "@elfui/core"');
    expect(vitestConfig).toContain('runtimeImport: "@elfui/core"');
    expect(vitestConfig).toContain('"e2e/**"');
  });

  it("does not write to disk during a dry run and skips style files for None", async () => {
    const projectDir = join(temporaryDirectory, "dry-run-app");
    const options = createScaffoldOptions("pnpm", {
      projectDir,
      style: "none",
      dryRun: true,
    });

    const result = await generateProject(options);

    expect(result.files).toEqual(listGeneratedFiles(options));
    expect(result.files.some((file) => file.includes("styles"))).toBe(false);
    await expect(access(projectDir)).rejects.toThrow();
  });

  it("rejects non-empty directories without force", async () => {
    const projectDir = join(temporaryDirectory, "existing-app");
    await generateProject(createScaffoldOptions("pnpm", { projectDir }));
    await writeFile(join(projectDir, "keep.txt"), "user content", "utf8");

    await expect(
      generateProject(createScaffoldOptions("pnpm", { projectDir })),
    ).rejects.toBeInstanceOf(TargetDirectoryNotEmptyError);
  });

  it("clears generated content with force while retaining an existing Git directory", async () => {
    const projectDir = join(temporaryDirectory, "force-app");
    await mkdir(join(projectDir, ".git"), { recursive: true });
    await writeFile(join(projectDir, ".git", "config"), "[core]", "utf8");
    await writeFile(join(projectDir, "obsolete.txt"), "obsolete", "utf8");

    await generateProject(
      createScaffoldOptions("pnpm", { projectDir, force: true }),
    );

    await access(join(projectDir, ".git", "config"));
    await access(join(projectDir, "src", "App.ts"));
    await expect(access(join(projectDir, "obsolete.txt"))).rejects.toThrow();
  });
});
