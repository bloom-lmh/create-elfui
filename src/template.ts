import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ejs from "ejs";

export type TemplateContext = Record<string, unknown>;

export const getTemplateRoot = (): string =>
  fileURLToPath(new URL("../templates/", import.meta.url));

const ensureInsideProject = (projectRoot: string, destination: string): void => {
  const relativePath = relative(projectRoot, destination);
  if (relativePath.startsWith("..") || relativePath === "") {
    throw new Error(`模板目标路径越界：${destination}`);
  }
};

export const renderTemplate = async (
  projectRoot: string,
  sourcePath: string,
  destinationPath: string,
  context: TemplateContext,
  templateRoot = getTemplateRoot()
): Promise<void> => {
  const source = resolve(templateRoot, sourcePath);
  const destination = resolve(projectRoot, destinationPath);
  ensureInsideProject(projectRoot, destination);

  const template = await readFile(source, "utf8");
  const rendered = ejs.render(template, context, { filename: source });
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, rendered, "utf8");
};

export const copyTemplate = async (
  projectRoot: string,
  sourcePath: string,
  destinationPath: string,
  templateRoot = getTemplateRoot()
): Promise<void> => {
  const source = resolve(templateRoot, sourcePath);
  const destination = resolve(projectRoot, destinationPath);
  ensureInsideProject(projectRoot, destination);

  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
};

export const templatePath = (...segments: string[]): string => join(...segments);
