import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateComponent } from "../src/component-generator";

describe("generateComponent", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "create-elfui-component-"));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("generates a styled Macro TypeScript component and Vitest coverage", async () => {
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify({
        dependencies: { "@elfui/core": "^0.1.0-beta.1" },
        devDependencies: { vitest: "^4.1.10" },
        scripts: { test: "vitest run" },
      }),
      "utf8",
    );
    await writeFile(join(projectRoot, "tsconfig.json"), "{}", "utf8");
    await mkdir(join(projectRoot, "src"), { recursive: true });
    await writeFile(join(projectRoot, "src", "App.scss"), "", "utf8");

    const result = await generateComponent({
      name: "user-card",
      projectRoot,
    });

    expect(result.componentName).toBe("UserCard");
    expect(result.files).toEqual([
      "src/components/UserCard.scss",
      "src/components/UserCard.ts",
      "src/components/__tests__/UserCard.spec.ts",
    ]);
    await expect(
      readFile(join(projectRoot, "src", "components", "UserCard.ts"), "utf8"),
    ).resolves.toContain('defineHtml, defineStyle } from "@elfui/core"');
    await expect(
      readFile(join(projectRoot, "src", "components", "UserCard.ts"), "utf8"),
    ).resolves.toContain("export default defineHtml");
    await expect(
      readFile(
        join(projectRoot, "src", "components", "__tests__", "UserCard.spec.ts"),
        "utf8",
      ),
    ).resolves.toContain("createApp(UserCard).mount(target)");
  });

  it("generates a Chain JavaScript component without styles or tests when absent", async () => {
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify({ dependencies: { "@elfui/chain": "^0.1.0-beta.1" } }),
      "utf8",
    );

    const result = await generateComponent({
      name: "StatusBadge",
      projectRoot,
      style: "none",
    });

    expect(result.files).toEqual(["src/components/StatusBadge.js"]);
    await expect(
      readFile(
        join(projectRoot, "src", "components", "StatusBadge.js"),
        "utf8",
      ),
    ).resolves.toContain('.name("elf-status-badge")');
  });

  it("does not write component files during a dry run", async () => {
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify({ dependencies: { elfui: "^0.1.0-beta.1" } }),
      "utf8",
    );
    await writeFile(join(projectRoot, "tsconfig.json"), "{}", "utf8");

    const result = await generateComponent({
      name: "Alert",
      projectRoot,
      style: "css",
      dryRun: true,
    });

    expect(result.files).toContain("src/components/Alert.ts");
    await expect(
      access(join(projectRoot, "src", "components", "Alert.ts")),
    ).rejects.toThrow();
  });

  it("refuses overwrites and directories outside the project by default", async () => {
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify({ dependencies: { "@elfui/chain": "^0.1.0-beta.1" } }),
      "utf8",
    );
    await generateComponent({ name: "Alert", projectRoot, style: "none" });

    await expect(
      generateComponent({ name: "Alert", projectRoot, style: "none" }),
    ).rejects.toThrow("组件文件已存在");
    await expect(
      generateComponent({
        name: "Outside",
        projectRoot,
        directory: "../outside",
      }),
    ).rejects.toThrow("组件目录必须位于项目内");
  });
});
