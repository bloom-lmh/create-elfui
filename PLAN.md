# create-elfui Plan

> ElfUI official project bootstrapper. This file tracks scaffold work only.

## A. Reliability

- [x] Macro projects declare `@elfui/runtime` directly for pnpm-compatible runtime imports.
- [x] Publish gate generates a real Macro consumer, installs with pnpm, and runs a Vite production build.
- [x] Validate a pnpm consumer with history Router, Vitest, and Playwright configuration.
- [x] Validate the equivalent consumer matrix with npm.
- [ ] Add a framework-version compatibility check before generation.

## B. Creation Experience

- [x] Support deterministic `--no-interactive` generation with an explicit target directory.
- [x] Initialize a Git repository by default, with `--no-git` to opt out.
- [x] Add recommended, minimal, and quality presets without expanding the default prompt flow.
- [x] Support `hash` and `history` Router modes.
- [x] Add a Playwright E2E testing option.
- [x] Generate optional GitHub Actions CI configuration.

## C. Ongoing Tooling

- [ ] Add `elfui generate component <name>` for Macro and Chain components.
- [ ] Add `elfui add <feature>` for Router, tests, formatting, and other optional integrations.
- [ ] Offer curated application and component-library templates.
