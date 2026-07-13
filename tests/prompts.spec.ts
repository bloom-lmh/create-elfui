import { describe, expect, it, vi } from "vitest";

import { createScaffoldOptions } from "../src/options";
import { promptForOptions } from "../src/prompts";

const promptMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(() => false),
  multiselect: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
}));

vi.mock("@clack/prompts", () => promptMocks);

describe("prompts", () => {
  it("offers a compact library configuration without application-only features", async () => {
    promptMocks.text.mockImplementation(({ initialValue }) =>
      Promise.resolve(initialValue),
    );
    promptMocks.select.mockImplementation(({ message, initialValue }) =>
      Promise.resolve(message === "项目模板" ? "library" : initialValue),
    );
    promptMocks.multiselect.mockResolvedValue([]);
    promptMocks.confirm.mockImplementation(({ initialValue }) =>
      Promise.resolve(initialValue),
    );

    const result = await promptForOptions(
      createScaffoldOptions("pnpm", { projectDir: "my-library" }),
      {
        askProjectDirectory: true,
        askFeatures: true,
        askPackageName: true,
        askSavePreset: false,
      },
    );

    expect(result.options).toMatchObject({
      template: "library",
      router: false,
      playwright: false,
      bare: false,
    });
    expect(promptMocks.multiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.not.arrayContaining([
          expect.objectContaining({ value: "router" }),
          expect.objectContaining({ value: "playwright" }),
          expect.objectContaining({ value: "bare" }),
        ]),
      }),
    );
  });

  it("keeps the exact directory name and can save an interactive preset", async () => {
    promptMocks.text.mockImplementation(({ message, initialValue }) =>
      Promise.resolve(
        message === "项目目录"
          ? "elfui-demo2"
          : message === "预设名称"
            ? "desktop"
            : initialValue,
      ),
    );
    promptMocks.select.mockImplementation(({ initialValue }) =>
      Promise.resolve(initialValue),
    );
    promptMocks.multiselect.mockResolvedValue(["eslint", "prettier"]);
    promptMocks.confirm.mockImplementation(({ message, initialValue }) =>
      Promise.resolve(message === "保存为用户预设？" ? true : initialValue),
    );

    const result = await promptForOptions(
      createScaffoldOptions("pnpm", { projectDir: "elfui-demo" }),
      {
        askProjectDirectory: true,
        askFeatures: true,
        askPackageName: true,
        askSavePreset: true,
      },
    );

    expect(result.options).toMatchObject({
      projectDir: "elfui-demo2",
      packageName: "elfui-demo2",
      eslint: true,
      prettier: true,
    });
    expect(result.savePresetName).toBe("desktop");
  });
});
