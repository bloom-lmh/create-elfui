import { join, parse } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  mkdtemp: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
  mkdir: fsMocks.mkdir,
  mkdtemp: fsMocks.mkdtemp,
}));

import { createStagingDirectory, isFileSystemRoot } from "../src/filesystem";

beforeEach(() => {
  fsMocks.mkdir.mockReset();
  fsMocks.mkdtemp.mockReset();
  fsMocks.mkdtemp.mockResolvedValue("staging-directory");
});

describe("filesystem paths", () => {
  it("recognizes the current platform root without trying to create it", () => {
    const root = parse(process.cwd()).root;

    expect(isFileSystemRoot(root)).toBe(true);
    expect(isFileSystemRoot(join(root, "elfui-projects"))).toBe(false);
  });

  it("does not call mkdir for a project directly below the filesystem root", async () => {
    const root = parse(process.cwd()).root;

    await expect(createStagingDirectory(join(root, "project"))).resolves.toBe(
      "staging-directory",
    );

    expect(fsMocks.mkdir).not.toHaveBeenCalled();
    expect(fsMocks.mkdtemp).toHaveBeenCalledWith(join(root, ".project-"));
  });

  it("still creates nested parent directories", async () => {
    const root = parse(process.cwd()).root;
    const parent = join(root, "projects");

    await createStagingDirectory(join(parent, "project"));

    expect(fsMocks.mkdir).toHaveBeenCalledWith(parent, { recursive: true });
  });
});
