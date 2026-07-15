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
- [x] Compact interactive feature selection, expose built-in and saved user presets, and preserve exact project-directory input.
- [x] Refresh generated application starter screens with the official ElfUI mark, responsive workspace layout, and useful Router landing pages.
- [x] Let creators start the generated application and open it in a browser directly from the creation flow.
- [x] Simplify generated starter branding to one transparent snowflake mark without a dark image panel.
- [x] Make recommended apps routable by default, simplify the home screen, and add an interactive component example page.
- [x] Center the starter brand lockup, animate the snowflake behind the wordmark, add route-entry motion, and show verified syntax-highlighted TypeScript component source.
- [x] Keep starter brand copy continuous, soften the horizontal wordmark gradient, and reduce the component showcase to equal-width counter panels.
- [x] Present the starter counter as a large interactive tile and keep its compact styled source within the equal-width code panel.
