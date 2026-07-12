import { describe, expect, it } from "vitest";

import {
  createScaffoldOptions,
  getPresetOverrides,
  inferPackageName,
  isValidPackageName,
  toValidPackageName,
} from "../src/options";
import {
  formatCommand,
  getDevCommand,
  getInstallCommand,
  inferPackageManager,
  requiresPackageManagerShell,
} from "../src/package-manager";

describe("options", () => {
  it("uses the documented default configuration", () => {
    const options = createScaffoldOptions("pnpm", {
      projectDir: "my-elfui-app",
    });

    expect(options).toMatchObject({
      projectDir: "my-elfui-app",
      packageName: "my-elfui-app",
      language: "ts",
      componentMode: "macro",
      style: "css",
      router: false,
      routerMode: "hash",
      git: true,
      install: false,
    });
  });

  it("normalizes an invalid package name", () => {
    expect(isValidPackageName("my-elfui-app")).toBe(true);
    expect(isValidPackageName("My ElfUI App")).toBe(false);
    expect(toValidPackageName("My ElfUI App!")).toBe("my-elfui-app");
    expect(inferPackageName("My ElfUI App!")).toBe("my-elfui-app");
  });

  it("provides focused presets without changing the base defaults", () => {
    expect(getPresetOverrides("recommended")).toEqual({
      eslint: true,
      prettier: true,
    });
    expect(getPresetOverrides("minimal")).toEqual({ bare: true });
    expect(getPresetOverrides("quality")).toEqual({
      eslint: true,
      prettier: true,
      vitest: true,
    });
  });

  it("infers supported package managers from npm user agents", () => {
    expect(
      inferPackageManager("pnpm/10.28.0 npm/? node/v22.22.0 win32 x64"),
    ).toBe("pnpm");
    expect(inferPackageManager("npm/11.0.0 node/v22.22.0 win32 x64")).toBe(
      "npm",
    );
    expect(inferPackageManager("unknown/1.0.0")).toBe("pnpm");
  });

  it("uses the Windows command shell for package manager child processes", () => {
    expect(requiresPackageManagerShell("win32")).toBe(true);
    expect(requiresPackageManagerShell("linux")).toBe(false);
  });

  it("formats package manager commands for generated instructions", () => {
    expect(formatCommand(getInstallCommand("pnpm"))).toBe("pnpm install");
    expect(formatCommand(getDevCommand("npm"))).toBe("npm run dev");
    expect(formatCommand(getDevCommand("bun"))).toBe("bun dev");
  });
});
