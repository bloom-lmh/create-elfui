import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProgram } from "../src/cli";

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

  it("keeps --no-install non-interactive", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const target = join(temporaryDirectory, "no-install-app");
    const rawArgs = ["--no-install", "--dry-run", target];

    await createProgram(rawArgs).parseAsync([
      "node",
      "create-elfui",
      ...rawArgs,
    ]);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"install": false'),
    );
  });
});
