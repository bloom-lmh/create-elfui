import type { ScaffoldOptions } from "./options";
import { dependencyVersions, type DependencyVersions } from "./versions";

export interface PackageManifest {
  name: string;
  version: string;
  private: boolean;
  type: "module";
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const sortObject = (entries: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)));

export const createPackageManifest = (
  options: ScaffoldOptions,
  versions: DependencyVersions = dependencyVersions
): PackageManifest => {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {
    vite: versions.vite
  };
  const scripts: Record<string, string> = {
    dev: "vite",
    build: "vite build",
    preview: "vite preview"
  };

  if (options.componentMode === "macro") {
    dependencies.elfui = versions.elfui;
    devDependencies["@elfui/vite-plugin"] = versions.vitePlugin;
  } else {
    dependencies["@elfui/chain"] = versions.chain;
  }

  if (options.router) dependencies["@elfui/router"] = versions.router;

  if (options.language === "ts") {
    devDependencies.typescript = versions.typescript;
    devDependencies["@types/node"] = versions.nodeTypes;
    scripts.typecheck = "tsc --noEmit";
  }

  if (options.style === "scss") devDependencies["sass-embedded"] = versions.sassEmbedded;
  if (options.style === "less") devDependencies.less = versions.less;

  if (options.vitest) {
    devDependencies.vitest = versions.vitest;
    devDependencies.jsdom = versions.jsdom;
    scripts.test = "vitest run";
    scripts["test:watch"] = "vitest";
  }

  if (options.eslint) {
    devDependencies.eslint = versions.eslint;
    devDependencies["@eslint/js"] = versions.eslintJs;
    devDependencies["typescript-eslint"] = versions.typescriptEslint;
    scripts.lint = "eslint .";
    scripts["lint:fix"] = "eslint . --fix";
  }

  if (options.prettier) {
    devDependencies.prettier = versions.prettier;
    if (options.eslint) devDependencies["eslint-config-prettier"] = versions.eslintConfigPrettier;
    scripts.format = "prettier . --write";
    scripts["format:check"] = "prettier . --check";
  }

  return {
    name: options.packageName,
    version: "0.0.0",
    private: true,
    type: "module",
    scripts,
    ...(Object.keys(dependencies).length > 0 ? { dependencies: sortObject(dependencies) } : {}),
    ...(Object.keys(devDependencies).length > 0
      ? { devDependencies: sortObject(devDependencies) }
      : {})
  };
};
