import { access, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProgram, shouldPromptForFeatureSelection } from "../src/cli";

describe("CLI", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "create-elfui-cli-"));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
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
