# create-elfui Plan

> ElfUI official project bootstrapper. This file tracks scaffold work only.

## A. Reliability

- [x] Macro projects declare `@elfui/runtime` directly for pnpm-compatible runtime imports.
- [x] Publish gate generates a real Macro consumer, installs with pnpm, and runs a Vite production build.
- [x] Validate a pnpm consumer with history Router, Vitest, and Playwright configuration.
- [x] Validate the equivalent consumer matrix with npm.
- [x] Add a framework-version compatibility check before generation.

## B. Creation Experience

- [x] Support deterministic `--no-interactive` generation with an explicit target directory.
- [x] Initialize a Git repository by default, with `--no-git` to opt out.
- [x] Add recommended, minimal, and quality presets without expanding the default prompt flow.
- [x] Support `hash` and `history` Router modes.
- [x] Add a Playwright E2E testing option.
- [x] Generate optional GitHub Actions CI configuration.
- [x] Save, reuse, list, and delete named user presets.

## C. Ongoing Tooling

- [x] Add `elfui generate component <name>` for Macro and Chain components.
- [x] Add `elfui add <feature>` for Router, tests, formatting, and other optional integrations.
- [x] Offer curated application and component-library templates.

## D. Parity Refinement

- [x] Let interactive users select an application or component-library template, and support explicit scoped package names for non-interactive publishing workflows.
