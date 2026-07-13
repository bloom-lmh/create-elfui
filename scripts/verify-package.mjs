import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  {
    cwd: packageRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  },
);

if (result.status !== 0) {
  throw new Error(
    `npm pack --dry-run failed: ${result.stderr || result.stdout}`,
  );
}

const [tarball] = JSON.parse(result.stdout);
const allowedFiles = /^(?:LICENSE|README\.md|package\.json|dist\/|templates\/)/;
const unexpectedFiles = tarball.files
  .map((file) => file.path)
  .filter((file) => !allowedFiles.test(file));

if (unexpectedFiles.length > 0) {
  throw new Error(
    `Tarball contains unexpected files: ${unexpectedFiles.join(", ")}`,
  );
}

for (const requiredFile of [
  "LICENSE",
  "README.md",
  "dist/index.js",
  "templates/common/assets/elfui-mark.png",
]) {
  if (!tarball.files.some((file) => file.path === requiredFile)) {
    throw new Error(`Tarball is missing ${requiredFile}.`);
  }
}
