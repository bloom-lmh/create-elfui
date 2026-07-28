import { InvalidOptionError } from "./errors";
import type { ScaffoldOptions } from "./options";
import type { DependencyVersions } from "./versions";

const exactSemverPattern =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const assertFrameworkCompatibility = (
  options: ScaffoldOptions,
  versions: DependencyVersions,
): void => {
  if (options.componentMode !== "macro") return;

  const selected = [
    ["@elfui/core", versions.core],
    ["@elfui/vite-plugin", versions.vitePlugin],
  ] as const;
  const nonExact = selected.find(
    ([, version]) => exactSemverPattern.test(version) === false,
  );

  if (nonExact) {
    throw new InvalidOptionError(
      `ElfUI Macro 依赖必须使用精确版本：${nonExact[0]} 为 ${nonExact[1]}。`,
    );
  }

  const expectedVersion = versions.core;
  const mismatch = selected.find(([, version]) => version !== expectedVersion);

  if (mismatch) {
    throw new InvalidOptionError(
      `ElfUI Macro 依赖版本不兼容：${mismatch[0]} 为 ${mismatch[1]}，应与 @elfui/core ${expectedVersion} 完全一致。`,
    );
  }
};
