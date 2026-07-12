import { InvalidOptionError } from "./errors";
import type { ScaffoldOptions } from "./options";
import type { DependencyVersions } from "./versions";

const normalizeVersion = (version: string): string =>
  version.replace(/^[~^]/, "");

export const assertFrameworkCompatibility = (
  options: ScaffoldOptions,
  versions: DependencyVersions,
): void => {
  const selected =
    options.componentMode === "macro"
      ? [
          ["@elfui/core", versions.core],
          ["@elfui/runtime", versions.runtime],
          ["@elfui/vite-plugin", versions.vitePlugin],
        ]
      : [["@elfui/chain", versions.chain]];

  if (options.router) selected.push(["@elfui/router", versions.router]);

  const expectedVersion = normalizeVersion(selected[0][1]);
  const mismatch = selected.find(
    ([, version]) => normalizeVersion(version) !== expectedVersion,
  );

  if (mismatch) {
    throw new InvalidOptionError(
      `ElfUI 框架依赖版本不兼容：${mismatch[0]} 为 ${mismatch[1]}，应与 ${expectedVersion} 同一发布批次。`,
    );
  }
};
