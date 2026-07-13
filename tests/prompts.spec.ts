import { describe, expect, it, vi } from "vitest";

import { createScaffoldOptions } from "../src/options";
import { promptForOptions } from "../src/prompts";

const promptMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(() => false),
  select: vi.fn(),
  text: vi.fn(),
}));

vi.mock("@clack/prompts", () => promptMocks);

describe("prompts", () => {
  it("offers a library template without application-only questions", async () => {
    promptMocks.text.mockImplementation(({ initialValue }) =>
      Promise.resolve(initialValue),
    );
    promptMocks.select.mockImplementation(({ message, initialValue }) =>
      Promise.resolve(message === "项目模板" ? "library" : initialValue),
    );
    promptMocks.confirm.mockImplementation(({ initialValue }) =>
      Promise.resolve(initialValue),
    );

    const result = await promptForOptions(
      createScaffoldOptions("pnpm", { projectDir: "my-library" }),
      { askProjectDirectory: true, askFeatures: true, askPackageName: true },
    );

    expect(result).toMatchObject({
      template: "library",
      router: false,
      playwright: false,
      bare: false,
    });
    expect(promptMocks.confirm).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "加入 Router？" }),
    );
    expect(promptMocks.confirm).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "加入 Playwright E2E 测试？" }),
    );
    expect(promptMocks.confirm).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: "生成 Bare 最小项目？" }),
    );
  });
});
