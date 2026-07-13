# create-elfui

## 0.1.0-beta.11

### Patch Changes

- 14c852e: Isolate npm consumer installs from publish lifecycle configuration so they resolve the generated project instead of the parent workspace.

## 0.1.0-beta.10

### Patch Changes

- 3966bba: Retry transient npm consumer installs during release verification and use the supported Node 22 release runtime.

## 0.1.0-beta.9

### Minor Changes

- dc3dc48: Add `elfui generate component <name>` for Macro and Chain projects, including automatic language, style, and Vitest detection.
