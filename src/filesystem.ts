import { mkdir, mkdtemp, readdir, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, join, parse, resolve } from "node:path";

import { InvalidOptionError } from "./errors";

export type TargetDirectoryState = "missing" | "empty" | "git-only" | "non-empty";

export const resolveProjectRoot = (projectDir: string): string => {
  const root = resolve(projectDir);
  if (root === parse(root).root) {
    throw new InvalidOptionError("不能把文件系统根目录作为项目目录。");
  }
  return root;
};

export const inspectTargetDirectory = async (target: string): Promise<TargetDirectoryState> => {
  try {
    const targetStat = await stat(target);
    if (!targetStat.isDirectory()) {
      throw new InvalidOptionError(`目标不是目录：${target}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }

  const entries = await readdir(target);
  if (entries.length === 0) return "empty";
  if (entries.length === 1 && entries[0] === ".git") return "git-only";
  return "non-empty";
};

export const createStagingDirectory = async (target: string): Promise<string> => {
  const parent = dirname(target);
  await mkdir(parent, { recursive: true });
  return mkdtemp(join(parent, `.${basename(target)}-`));
};

export const clearDirectoryPreservingGit = async (target: string): Promise<void> => {
  const entries = await readdir(target);
  await Promise.all(
    entries
      .filter((entry) => entry !== ".git")
      .map((entry) => rm(join(target, entry), { recursive: true, force: true }))
  );
};

export const moveStagingDirectory = async (staging: string, target: string): Promise<void> => {
  await rename(staging, target);
};
