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
import { dependencyVersions } from "../src/versions";

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
    expect(manifest.dependencies).toHaveProperty("@elfui/core", "0.1.0-beta.6");
    expect(manifest.dependencies).not.toHaveProperty("@elfui/runtime");
    expect(manifest.devDependencies).toHaveProperty(
      "@elfui/vite-plugin",
      "0.1.0-beta.6",
    );
    expect(manifest.dependencies).not.toHaveProperty("@elfui/chain");
    await access(join(projectDir, ".gitignore"));
    await access(join(projectDir, "src", "assets", "elfui-mark.png"));
    await expect(
      readFile(join(projectDir, "src", "App.ts"), "utf8"),
    ).resolves.toContain(
      'new URL("./assets/elfui-mark.png", import.meta.url).href',
    );
    await expect(
      readFile(join(projectDir, "src", "App.ts"), "utf8"),
    ).resolves.toContain("export default defineHtml(`");
    await expect(
      readFile(join(projectDir, "src", "App.ts"), "utf8"),
    ).resolves.not.toContain("defineHtml(html`");
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
    expect(manifest.dependencies).toHaveProperty(
      "@elfui/chain",
      "0.1.0-beta.3",
    );
    expect(manifest.dependencies).toHaveProperty(
      "@elfui/router",
      "0.1.0-beta.3",
    );
    expect(manifest.devDependencies).toHaveProperty("less");
    expect(manifest.devDependencies).not.toHaveProperty("@elfui/vite-plugin");
    await access(join(projectDir, "src", "router", "index.js"));
    await access(join(projectDir, "src", "pages", "Example.js"));
    await access(join(projectDir, "src", "App.less"));
    await access(join(projectDir, "src", "pages", "page.less"));
    expect(
      await readFile(join(projectDir, "src", "pages", "Home.js"), "utf8"),
    ).toContain(".style(styles)");
    const example = await readFile(
      join(projectDir, "src", "pages", "Example.js"),
      "utf8",
    );
    expect(example).toContain("{{ codeTick }}");
    expect(example).toContain("{{ codeButtonOpen }}");
    expect(example).toContain("{{ codeCount }}");
    expect(example).toContain("优雅的组件定义方式");
    expect(example).not.toContain('data-line="2"></span>');
    expect(example).not.toContain("&#96;");
    expect(example).not.toContain("=&gt;");
    await expect(
      readFile(join(projectDir, "src", "App.js"), "utf8"),
    ).resolves.toContain('to="/example"');
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
    const home = await readFile(
      join(projectDir, "src", "pages", "Home.ts"),
      "utf8",
    );
    const example = await readFile(
      join(projectDir, "src", "pages", "Example.ts"),
      "utf8",
    );
    const pageStyle = await readFile(
      join(projectDir, "src", "pages", "page.css"),
      "utf8",
    );

    expect(router).toContain('mode: "history"');
    expect(readme).toContain("未知路径回退到 `index.html`");
    expect(home).toContain('<h1 class="hero-title">ElfUI</h1>');
    expect(home).toContain("一款专为组件而生的 Web Component 框架");
    expect(home).not.toContain('aria-hidden="true">E');
    expect(home).toContain('class="hero-mark"');
    expect(example).toContain("Counter.ts");
    expect(example).toContain("counter-button");
    expect(example).toContain('class="token-keyword"');
    expect(example).toContain("codeButtonOpen");
    expect(example).toContain("优雅的组件定义方式");
    expect(example).toContain("<strong>${count}</strong>");
    expect(example).toContain("${count}");
    expect(example).not.toContain("reset");
    expect(example).not.toContain('data-line="2"></span>');
    expect(pageStyle).toContain("snowflake-spin 32s linear infinite");
    expect(pageStyle).toContain("route-enter 420ms");
    expect(pageStyle).toContain("linear-gradient(90deg");
    expect(pageStyle).not.toContain("-webkit-text-stroke");
    expect(pageStyle).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr))",
    );
    expect(pageStyle).toContain("width: 188px");
    expect(pageStyle).toContain("height: 128px");
    expect(pageStyle).toContain("border-radius: 18px");
    expect(pageStyle).toContain("white-space: pre-wrap");
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
              result.files
                .filter((file) => !file.endsWith(".png"))
                .map((file) => readFile(join(projectDir, file), "utf8")),
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
              expect(manifest.dependencies).not.toHaveProperty(
                "@elfui/runtime",
              );
              expect(manifest.devDependencies).toHaveProperty(
                "@elfui/vite-plugin",
                "0.1.0-beta.6",
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

  it("renders a CI workflow with only the selected quality checks", async () => {
    const projectDir = join(temporaryDirectory, "ci-app");
    await generateProject(
      createScaffoldOptions("pnpm", {
        projectDir,
        eslint: true,
        vitest: true,
        playwright: true,
        githubActions: true,
      }),
    );

    const workflow = await readFile(
      join(projectDir, ".github", "workflows", "ci.yml"),
      "utf8",
    );

    expect(workflow).toContain("pnpm/action-setup@v4");
    expect(workflow).toContain("pnpm install --frozen-lockfile");
    expect(workflow).toContain("pnpm lint");
    expect(workflow).toContain("pnpm test");
    expect(workflow).toContain(
      "pnpm exec playwright install --with-deps chromium",
    );
    expect(workflow).toContain("pnpm test:e2e");
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

  it("generates a publishable Macro component library", async () => {
    const projectDir = join(temporaryDirectory, "component-library");
    const options = createScaffoldOptions("pnpm", {
      projectDir,
      template: "library",
      style: "scss",
      vitest: true,
      eslint: true,
      prettier: true,
      githubActions: true,
    });

    const result = await generateProject(options);
    const manifest = JSON.parse(
      await readFile(join(projectDir, "package.json"), "utf8"),
    ) as {
      files: string[];
      private: boolean;
      dependencies?: Record<string, string>;
      peerDependencies: Record<string, string>;
      exports: Record<string, Record<string, string>>;
    };

    expect(result.files).toContain("src/ElfLibraryButton.ts");
    expect(result.files).toContain("src/env.d.ts");
    expect(result.files).toContain("src/__tests__/ElfLibraryButton.spec.ts");
    expect(result.files).not.toContain("index.html");
    expect(manifest.files).toEqual(["dist"]);
    expect(manifest.private).toBe(false);
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.peerDependencies).toMatchObject({
      "@elfui/core": expect.any(String),
    });
    expect(manifest.peerDependencies).not.toHaveProperty("@elfui/runtime");
    expect(manifest.exports["."]).toMatchObject({
      import: "./dist/index.js",
      types: "./dist/index.d.ts",
    });
    const viteConfig = await readFile(
      join(projectDir, "vite.config.ts"),
      "utf8",
    );
    expect(viteConfig).toContain("build: {");
    expect(viteConfig).toContain('"@elfui/core/internal"');
    expect(viteConfig).not.toContain('"@elfui/runtime"');
    await expect(
      readFile(join(projectDir, "src", "ElfLibraryButton.scss"), "utf8"),
    ).resolves.toContain(".elf-library-button");
    await expect(
      access(join(projectDir, "eslint.config.js")),
    ).resolves.toBeUndefined();
  });

  it("rejects incompatible framework versions before writing a project", async () => {
    const projectDir = join(temporaryDirectory, "incompatible-framework-app");

    await expect(
      generateProject(createScaffoldOptions("pnpm", { projectDir }), {
        versions: { ...dependencyVersions, vitePlugin: "^0.1.0-beta.2" },
      }),
    ).rejects.toThrow("@elfui/vite-plugin 为 ^0.1.0-beta.2");

    await expect(access(projectDir)).rejects.toThrow();
  });

  it("allows Router to use its independent release version", async () => {
    const projectDir = join(temporaryDirectory, "independent-router-version");

    await expect(
      generateProject(
        createScaffoldOptions("pnpm", { projectDir, router: true }),
        {
          versions: {
            ...dependencyVersions,
            core: "0.1.0-beta.6",
            vitePlugin: "0.1.0-beta.6",
            router: "0.1.0-beta.3",
          },
        },
      ),
    ).resolves.toBeDefined();

    const manifest = JSON.parse(
      await readFile(join(projectDir, "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    expect(manifest.dependencies["@elfui/router"]).toBe("0.1.0-beta.3");
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
