# create-elfui

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
