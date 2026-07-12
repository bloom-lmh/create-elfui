import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createScaffoldOptions } from "../src/options";
import {
  deleteUserPreset,
  getUserPreset,
  listUserPresets,
  saveUserPreset,
  toUserPresetOverrides,
} from "../src/user-presets";

describe("user presets", () => {
  let temporaryDirectory: string;
  let presetPath: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "create-elfui-presets-"));
    presetPath = join(temporaryDirectory, "presets.json");
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("saves, loads, and deletes reusable project choices", async () => {
    const options = createScaffoldOptions("pnpm", {
      componentMode: "chain",
      style: "scss",
      router: true,
      routerMode: "history",
      vitest: true,
      githubActions: true,
      git: false,
    });

    await saveUserPreset("work", options, presetPath);

    await expect(getUserPreset("work", presetPath)).resolves.toMatchObject({
      componentMode: "chain",
      style: "scss",
      router: true,
      routerMode: "history",
      githubActions: true,
      git: false,
    });
    expect(
      toUserPresetOverrides(await getUserPreset("work", presetPath)),
    ).toEqual(
      expect.objectContaining({ componentMode: "chain", style: "scss" }),
    );

    await deleteUserPreset("work", presetPath);
    await expect(listUserPresets(presetPath)).resolves.toEqual({});
  });

  it("rejects malformed preset files", async () => {
    await writeFile(presetPath, '{"version":1,"presets":{"bad":{}}}', "utf8");

    await expect(listUserPresets(presetPath)).rejects.toThrow(
      "预设配置文件格式无效",
    );
  });
});
