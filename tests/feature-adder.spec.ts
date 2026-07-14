import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addFeature } from "../src/feature-adder";
import { generateProject } from "../src/generator";
import { createScaffoldOptions } from "../src/options";

describe("addFeature", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "create-elfui-add-"));
    await generateProject(
      createScaffoldOptions("pnpm", {
        projectDir: projectRoot,
        git: false,
      }),
    );
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("adds Router files, dependencies, and the default application shell", async () => {
    const result = await addFeature({
      feature: "router",
      projectRoot,
      routerMode: "history",
    });
    const manifest = JSON.parse(
      await readFile(join(projectRoot, "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };

    expect(result.files).toContain("src/router/index.ts");
    expect(result.files).toContain("src/pages/Example.ts");
    expect(manifest.dependencies).toHaveProperty("@elfui/router");
    await expect(
      readFile(join(projectRoot, "src", "App.ts"), "utf8"),
    ).resolves.toContain("<elf-router-view>");
    await expect(
      readFile(join(projectRoot, "src", "main.ts"), "utf8"),
    ).resolves.toContain('import "./router"');
    await expect(
      readFile(join(projectRoot, "src", "router", "index.ts"), "utf8"),
    ).resolves.toContain('mode: "history"');
  });

  it("adds Vitest and Prettier without changing unrelated source files", async () => {
    const originalApp = await readFile(
      join(projectRoot, "src", "App.ts"),
      "utf8",
    );
    await addFeature({ feature: "vitest", projectRoot });
    await addFeature({ feature: "prettier", projectRoot });
    const manifest = JSON.parse(
      await readFile(join(projectRoot, "package.json"), "utf8"),
    ) as {
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(manifest.devDependencies).toHaveProperty("vitest");
    expect(manifest.devDependencies).toHaveProperty("prettier");
    expect(manifest.scripts).toMatchObject({
      test: "vitest run",
      format: "prettier . --write",
    });
    await expect(
      readFile(join(projectRoot, "src", "App.ts"), "utf8"),
    ).resolves.toBe(originalApp);
  });

  it("does not write files during a dry run", async () => {
    const before = await readFile(join(projectRoot, "package.json"), "utf8");
    const result = await addFeature({
      feature: "playwright",
      projectRoot,
      dryRun: true,
    });

    expect(result.files).toContain("playwright.config.ts");
    await expect(
      readFile(join(projectRoot, "package.json"), "utf8"),
    ).resolves.toBe(before);
  });

  it("renders a GitHub Actions workflow from the detected project settings", async () => {
    await addFeature({ feature: "github-actions", projectRoot });

    await expect(
      readFile(join(projectRoot, ".github", "workflows", "ci.yml"), "utf8"),
    ).resolves.toContain("pnpm install --frozen-lockfile");
  });

  it("protects a custom root component from Router replacement", async () => {
    await writeFile(
      join(projectRoot, "src", "App.ts"),
      "export default {}\n",
      "utf8",
    );

    await expect(
      addFeature({ feature: "router", projectRoot }),
    ).rejects.toThrow("无法安全替换自定义 src/App");
  });
});
