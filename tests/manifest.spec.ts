import { describe, expect, it } from "vitest";

import { createPackageManifest } from "../src/manifest";
import { createScaffoldOptions } from "../src/options";
import { frameworkDependencyVersions } from "../src/framework-versions.generated";

describe("createPackageManifest", () => {
  it("adds only Macro dependencies for the default application", () => {
    const manifest = createPackageManifest(createScaffoldOptions("pnpm"));

    expect(manifest.dependencies).toEqual({
      "@elfui/core": frameworkDependencyVersions.core,
      "@elfui/runtime": frameworkDependencyVersions.runtime,
    });
    expect(manifest.devDependencies).toMatchObject({
      "@elfui/vite-plugin": frameworkDependencyVersions.vitePlugin,
      typescript: "^5.9.3",
      vite: "^8.1.4",
    });
    expect(manifest.dependencies).not.toHaveProperty("@elfui/chain");
    expect(manifest.scripts).toHaveProperty("typecheck", "tsc --noEmit");
  });

  it("adds Chain, Router, Less and quality dependencies only when selected", () => {
    const manifest = createPackageManifest(
      createScaffoldOptions("npm", {
        language: "js",
        componentMode: "chain",
        style: "less",
        router: true,
        vitest: true,
        eslint: true,
        prettier: true,
      }),
    );

    expect(manifest.dependencies).toEqual({
      "@elfui/chain": frameworkDependencyVersions.chain,
      "@elfui/router": frameworkDependencyVersions.router,
    });
    expect(manifest.devDependencies).toMatchObject({
      less: "^4.6.7",
      vitest: "^4.1.10",
      eslint: "^10.7.0",
      prettier: "^3.9.5",
    });
    expect(manifest.devDependencies).not.toHaveProperty("@elfui/vite-plugin");
    expect(manifest.devDependencies).not.toHaveProperty("typescript");
    expect(manifest.scripts).not.toHaveProperty("typecheck");
  });

  it("adds Playwright only when E2E testing is selected", () => {
    const manifest = createPackageManifest(
      createScaffoldOptions("pnpm", { playwright: true }),
    );

    expect(manifest.devDependencies).toHaveProperty(
      "@playwright/test",
      "^1.61.1",
    );
    expect(manifest.scripts).toHaveProperty("test:e2e", "playwright test");
  });
});
