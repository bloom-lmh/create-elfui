import { access, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProgram, shouldPromptForFeatureSelection } from "../src/cli";

describe("CLI", () => {
  let temporaryDirectory: string;
  let originalPresetPath: string | undefined;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "create-elfui-cli-"));
    originalPresetPath = process.env.CREATE_ELFUI_PRESETS_FILE;
    process.env.CREATE_ELFUI_PRESETS_FILE = join(
      temporaryDirectory,
      "presets.json",
    );
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
    if (originalPresetPath === undefined) {
      delete process.env.CREATE_ELFUI_PRESETS_FILE;
    } else {
      process.env.CREATE_ELFUI_PRESETS_FILE = originalPresetPath;
    }
    vi.restoreAllMocks();
  });

  it("supports a non-interactive dry run", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "dry-run-app");
    const rawArgs = ["--default", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("将使用以下配置"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("src/App.ts"));
  });

  it("rejects contradictory component flags", async () => {
    const target = join(temporaryDirectory, "conflict-app");
    const rawArgs = ["--component", "chain", "--macro", "--dry-run", target];

    await expect(
      createProgram(rawArgs).parseAsync(["node", "create-elfui", ...rawArgs]),
    ).rejects.toThrow("--component chain 与 --macro 不能同时使用。");
  });

  it("keeps --default non-interactive when installing dependencies", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "default-install-app");
    const rawArgs = ["--default", "--install", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"install": true'),
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"eslint": true'));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"prettier": true'),
    );
  });

  it("applies quality presets without entering feature prompts", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "quality-preset-app");
    const rawArgs = ["--preset", "quality", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('"vitest": true'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"eslint": true'));
    expect(shouldPromptForFeatureSelection(rawArgs, false)).toBe(false);
  });

  it("enables Router when a router mode is provided", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "history-router-app");
    const rawArgs = ["--router-mode", "history", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('"router": true'));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"routerMode": "history"'),
    );
  });

  it("selects Playwright without entering feature prompts", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "playwright-app");
    const rawArgs = ["--playwright", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"playwright": true'),
    );
  });

  it("selects GitHub Actions without entering feature prompts", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "github-actions-app");
    const rawArgs = ["--github-actions", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"githubActions": true'),
    );
  });

  it("saves and reuses a named user preset", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const saveTarget = join(temporaryDirectory, "save-preset-app");
    const saveArgs = [
      "--preset",
      "quality",
      "--router-mode",
      "history",
      "--github-actions",
      "--no-git",
      "--save-preset",
      "work",
      "--dry-run",
      saveTarget,
    ];

    await createProgram(saveArgs).parseAsync([
      "node",
      "create-elfui",
      ...saveArgs,
    ]);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("已保存预设：work"),
    );

    log.mockClear();
    const useTarget = join(temporaryDirectory, "use-preset-app");
    const useArgs = ["--use-preset", "work", "--dry-run", useTarget];
    await createProgram(useArgs).parseAsync([
      "node",
      "create-elfui",
      ...useArgs,
    ]);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"routerMode": "history"'),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"githubActions": true'),
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"git": false'));
  });

  it("lists and deletes named user presets", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "preset-app");
    const saveArgs = [
      "--default",
      "--save-preset",
      "work",
      "--dry-run",
      target,
    ];

    await createProgram(saveArgs).parseAsync([
      "node",
      "create-elfui",
      ...saveArgs,
    ]);

    log.mockClear();
    await createProgram(["--list-presets"]).parseAsync([
      "node",
      "create-elfui",
      "--list-presets",
    ]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"work"'));

    log.mockClear();
    await createProgram(["--delete-preset", "work"]).parseAsync([
      "node",
      "create-elfui",
      "--delete-preset",
      "work",
    ]);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("已删除预设：work"),
    );
  });

  it("keeps feature prompts when --install is the only option", () => {
    expect(shouldPromptForFeatureSelection(["--install"], false)).toBe(true);
    expect(shouldPromptForFeatureSelection(["--no-install"], false)).toBe(true);
    expect(shouldPromptForFeatureSelection(["--router"], false)).toBe(false);
    expect(shouldPromptForFeatureSelection(["--default"], true)).toBe(false);
  });

  it("uses defaults without prompts when --no-interactive is set", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "no-interactive-app");
    const rawArgs = ["--no-interactive", "--no-git", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('"git": false'));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"componentMode": "macro"'),
    );
  });

  it("requires a directory in non-interactive mode", async () => {
    await expect(
      createProgram(["--no-interactive", "--dry-run"]).parseAsync([
        "node",
        "create-elfui",
        "--no-interactive",
        "--dry-run",
      ]),
    ).rejects.toThrow("--no-interactive 必须同时提供项目目录。");
  });

  it("initializes Git by default and supports --no-git", async () => {
    const gitTarget = join(temporaryDirectory, "git-app");
    const noGitTarget = join(temporaryDirectory, "no-git-app");

    await createProgram(["--default", "--no-install", gitTarget]).parseAsync([
      "node",
      "create-elfui",
      "--default",
      "--no-install",
      gitTarget,
    ]);
    await access(join(gitTarget, ".git"));

    await createProgram([
      "--default",
      "--no-install",
      "--no-git",
      noGitTarget,
    ]).parseAsync([
      "node",
      "create-elfui",
      "--default",
      "--no-install",
      "--no-git",
      noGitTarget,
    ]);
    await expect(access(join(noGitTarget, ".git"))).rejects.toThrow();
  });
});
