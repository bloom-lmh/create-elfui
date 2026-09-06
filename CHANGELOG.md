# create-elfui

## 0.1.0-beta.27

### Patch Changes

- Upgrade the release runner to npm 11.19.1 so generated npm consumers can complete dependency installation without the older Arborist `edgesOut` crash.

## 0.1.0-beta.26

### Patch Changes

- Create missing projects directly below a Windows drive root without attempting to recreate the drive, and generate Router beta.12 for routed applications.

## 0.1.0-beta.25

### Patch Changes

- 8142097: Upgrade generated projects to ElfUI beta.21 and refine the component example so its content is vertically centered without a desktop page scrollbar.

## 0.1.0-beta.24

### Patch Changes

- 2330702: Pin generated Macro projects to matching `@elfui/core` and `@elfui/vite-plugin` beta.13 releases, reject ranged or mismatched framework versions, and verify Vite reports version mismatches during startup.

## 0.1.0-beta.23

### Patch Changes

- d3664c6: Upgrade generated Macro projects to ElfUI beta.7 and replace the removed `html`/`css` tagged-template helpers with direct string arguments in every application, library, and component-generator template.

## 0.1.0-beta.22

### Patch Changes

- eeb1e93: Report the actual published `create-elfui` package version from `--version` and verify the bundled CLI version during the release gate.

## 0.1.0-beta.21

### Patch Changes

- f41dba7: Generate Macro applications and component libraries for the ElfUI beta.6 Core internal bridge. New scaffolds use `@elfui/core` as their only direct runtime dependency, externalize `@elfui/core/internal` in component libraries, and follow the independent Router and Chain beta versions.

## 0.1.0-beta.20

### Minor Changes

- 204ed08: Refine the generated component showcase with a large interactive counter tile, compact continuous source lines, embedded button styles, and overflow-safe code panels.

## 0.1.0-beta.19

### Minor Changes

- 0846242: Simplify generated starter branding with continuous copy and a subtle horizontal wordmark gradient, and replace the component showcase with equal-width code and interactive counter panels.

## 0.1.0-beta.18

### Minor Changes

- 96c5a3f: Polish the starter brand lockup and route motion, and replace escaped example snippets with verified syntax-highlighted TypeScript single-file component source for Macro and Chain projects.

## 0.1.0-beta.17

### Minor Changes

- c08b409: Enable Router in the recommended preset, simplify the generated home page, add an interactive component example, and pin the verified ElfUI beta dependency set.

## 0.1.0-beta.16

### Minor Changes

- d37fbc2: Simplify generated application starter branding with a single transparent snowflake mark on light pages.

## 0.1.0-beta.15

### Minor Changes

- b9fa84d: Add interactive and command-line options to start a generated application and open it in a browser after dependency installation.

## 0.1.0-beta.14

### Minor Changes

- 1bd32cd: Refresh generated application starter screens with the official ElfUI mark, a responsive workspace layout, and Router-aware landing pages.

## 0.1.0-beta.13

### Minor Changes

- 139fca5: Compact the interactive creation flow with preset and feature selectors, support saving presets directly from the flow, and preserve exact project directory names.
- 035bc3a: Add interactive template selection and a `--package-name` option for scoped application and component-library packages.

## 0.1.0-beta.12

### Minor Changes

- 293fe00: Add a publishable component-library template through `--template library`, including TypeScript declarations, peer dependencies, and optional quality tooling.
- 47783d7: Add `elfui add <feature>` for Router, Vitest, Playwright, ESLint, Prettier, and GitHub Actions in existing projects.

## 0.1.0-beta.11

### Patch Changes

- 14c852e: Isolate npm consumer installs from publish lifecycle configuration so they resolve the generated project instead of the parent workspace.

## 0.1.0-beta.10

### Patch Changes

- 3966bba: Retry transient npm consumer installs during release verification and use the supported Node 22 release runtime.

## 0.1.0-beta.9

### Minor Changes

- dc3dc48: Add `elfui generate component <name>` for Macro and Chain projects, including automatic language, style, and Vitest detection.
