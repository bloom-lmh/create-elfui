import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { InvalidOptionError } from "./errors";
import {
  componentModes,
  languages,
  routerModes,
  styleSolutions,
  type ScaffoldOptionOverrides,
  type ScaffoldOptions,
} from "./options";
import { packageManagers } from "./package-manager";

const presetNamePattern = /^[a-z][a-z0-9-]{0,63}$/;

export interface UserPreset {
  language: ScaffoldOptions["language"];
  componentMode: ScaffoldOptions["componentMode"];
  style: ScaffoldOptions["style"];
  router: boolean;
  routerMode: ScaffoldOptions["routerMode"];
  vitest: boolean;
  playwright: boolean;
  eslint: boolean;
  prettier: boolean;
  bare: boolean;
  git: boolean;
  githubActions: boolean;
  packageManager: ScaffoldOptions["packageManager"];
  install: boolean;
}

interface UserPresetFile {
  version: 1;
  presets: Record<string, UserPreset>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

const isOneOf = <T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] => typeof value === "string" && values.includes(value);

const parsePreset = (value: unknown): UserPreset | null => {
  if (!isRecord(value)) return null;
  if (
    !isOneOf(value.language, languages) ||
    !isOneOf(value.componentMode, componentModes) ||
    !isOneOf(value.style, styleSolutions) ||
    !isOneOf(value.routerMode, routerModes) ||
    !isOneOf(value.packageManager, packageManagers) ||
    !isBoolean(value.router) ||
    !isBoolean(value.vitest) ||
    !isBoolean(value.playwright) ||
    !isBoolean(value.eslint) ||
    !isBoolean(value.prettier) ||
    !isBoolean(value.bare) ||
    !isBoolean(value.git) ||
    !isBoolean(value.githubActions) ||
    !isBoolean(value.install)
  ) {
    return null;
  }

  return {
    language: value.language,
    componentMode: value.componentMode,
    style: value.style,
    router: value.router,
    routerMode: value.routerMode,
    vitest: value.vitest,
    playwright: value.playwright,
    eslint: value.eslint,
    prettier: value.prettier,
    bare: value.bare,
    git: value.git,
    githubActions: value.githubActions,
    packageManager: value.packageManager,
    install: value.install,
  };
};

export const resolveUserPresetPath = (): string =>
  process.env.CREATE_ELFUI_PRESETS_FILE ??
  join(homedir(), ".create-elfui", "presets.json");

export const assertValidPresetName = (name: string): void => {
  if (!presetNamePattern.test(name)) {
    throw new InvalidOptionError(
      "预设名称只能使用小写字母、数字和连字符，且必须以字母开头。",
    );
  }
};

const readPresetFile = async (path: string): Promise<UserPresetFile> => {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, presets: {} };
    }
    throw error;
  }

  try {
    const parsed: unknown = JSON.parse(source);
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      !isRecord(parsed.presets)
    ) {
      throw new Error("invalid format");
    }

    const presets: Record<string, UserPreset> = {};
    for (const [name, value] of Object.entries(parsed.presets)) {
      const preset = parsePreset(value);
      if (!preset || !presetNamePattern.test(name)) {
        throw new Error("invalid preset");
      }
      presets[name] = preset;
    }
    return { version: 1, presets };
  } catch {
    throw new InvalidOptionError(`预设配置文件格式无效：${path}`);
  }
};

const writePresetFile = async (
  path: string,
  presetFile: UserPresetFile,
): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(presetFile, null, 2)}\n`, "utf8");
};

export const toUserPreset = (options: ScaffoldOptions): UserPreset => ({
  language: options.language,
  componentMode: options.componentMode,
  style: options.style,
  router: options.router,
  routerMode: options.routerMode,
  vitest: options.vitest,
  playwright: options.playwright,
  eslint: options.eslint,
  prettier: options.prettier,
  bare: options.bare,
  git: options.git,
  githubActions: options.githubActions,
  packageManager: options.packageManager,
  install: options.install,
});

export const toUserPresetOverrides = (
  preset: UserPreset,
): ScaffoldOptionOverrides => ({ ...preset });

export const listUserPresets = async (
  path = resolveUserPresetPath(),
): Promise<Record<string, UserPreset>> => (await readPresetFile(path)).presets;

export const getUserPreset = async (
  name: string,
  path = resolveUserPresetPath(),
): Promise<UserPreset> => {
  assertValidPresetName(name);
  const preset = (await readPresetFile(path)).presets[name];
  if (!preset) {
    throw new InvalidOptionError(
      `未找到预设“${name}”。使用 --list-presets 查看可用预设。`,
    );
  }
  return preset;
};

export const saveUserPreset = async (
  name: string,
  options: ScaffoldOptions,
  path = resolveUserPresetPath(),
): Promise<void> => {
  assertValidPresetName(name);
  const presetFile = await readPresetFile(path);
  presetFile.presets[name] = toUserPreset(options);
  await writePresetFile(path, presetFile);
};

export const deleteUserPreset = async (
  name: string,
  path = resolveUserPresetPath(),
): Promise<void> => {
  assertValidPresetName(name);
  const presetFile = await readPresetFile(path);
  if (!presetFile.presets[name]) {
    throw new InvalidOptionError(`未找到预设“${name}”。`);
  }
  delete presetFile.presets[name];
  await writePresetFile(path, presetFile);
};
