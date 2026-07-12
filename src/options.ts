import { basename, resolve } from "node:path";

import type { PackageManager } from "./package-manager";

export const languages = ["ts", "js"] as const;
export const componentModes = ["macro", "chain"] as const;
export const styleSolutions = ["css", "scss", "less", "none"] as const;
export const scaffoldPresets = ["recommended", "minimal", "quality"] as const;
export const routerModes = ["hash", "history"] as const;

export type Language = (typeof languages)[number];
export type ComponentMode = (typeof componentModes)[number];
export type StyleSolution = (typeof styleSolutions)[number];
export type ScaffoldPreset = (typeof scaffoldPresets)[number];
export type RouterMode = (typeof routerModes)[number];

export interface ScaffoldOptions {
  projectDir: string;
  packageName: string;
  language: Language;
  componentMode: ComponentMode;
  style: StyleSolution;
  router: boolean;
  routerMode: RouterMode;
  vitest: boolean;
  playwright: boolean;
  eslint: boolean;
  prettier: boolean;
  bare: boolean;
  git: boolean;
  packageManager: PackageManager;
  install: boolean;
  force: boolean;
  dryRun: boolean;
}

export interface ScaffoldOptionOverrides {
  projectDir?: string;
  packageName?: string;
  language?: Language;
  componentMode?: ComponentMode;
  style?: StyleSolution;
  router?: boolean;
  routerMode?: RouterMode;
  vitest?: boolean;
  playwright?: boolean;
  eslint?: boolean;
  prettier?: boolean;
  bare?: boolean;
  git?: boolean;
  packageManager?: PackageManager;
  install?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export const getPresetOverrides = (
  preset: ScaffoldPreset,
): ScaffoldOptionOverrides => {
  switch (preset) {
    case "minimal":
      return { bare: true };
    case "quality":
      return { eslint: true, prettier: true, vitest: true };
    case "recommended":
      return { eslint: true, prettier: true };
  }
};

export const isValidPackageName = (value: string): boolean =>
  /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(value);

export const toValidPackageName = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z0-9-~]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "elfui-app";
};

export const inferPackageName = (projectDir: string): string => {
  const directoryName = basename(resolve(projectDir));
  return isValidPackageName(directoryName)
    ? directoryName
    : toValidPackageName(directoryName);
};

export const createScaffoldOptions = (
  packageManager: PackageManager,
  overrides: ScaffoldOptionOverrides = {},
): ScaffoldOptions => {
  const projectDir = overrides.projectDir?.trim() || "elfui-app";
  const packageName =
    overrides.packageName?.trim() || inferPackageName(projectDir);

  return {
    projectDir,
    packageName,
    language: overrides.language ?? "ts",
    componentMode: overrides.componentMode ?? "macro",
    style: overrides.style ?? "css",
    router: overrides.router ?? false,
    routerMode: overrides.routerMode ?? "hash",
    vitest: overrides.vitest ?? false,
    playwright: overrides.playwright ?? false,
    eslint: overrides.eslint ?? false,
    prettier: overrides.prettier ?? false,
    bare: overrides.bare ?? false,
    git: overrides.git ?? true,
    packageManager: overrides.packageManager ?? packageManager,
    install: overrides.install ?? false,
    force: overrides.force ?? false,
    dryRun: overrides.dryRun ?? false,
  };
};
