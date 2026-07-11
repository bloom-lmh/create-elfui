import {
  frameworkDependencyVersions,
  type FrameworkDependencyVersions
} from "./framework-versions.generated";

export interface DependencyVersions extends FrameworkDependencyVersions {
  vite: string;
  typescript: string;
  nodeTypes: string;
  vitest: string;
  jsdom: string;
  eslint: string;
  eslintJs: string;
  typescriptEslint: string;
  eslintConfigPrettier: string;
  prettier: string;
  sassEmbedded: string;
  less: string;
}

export const dependencyVersions: DependencyVersions = {
  ...frameworkDependencyVersions,
  vite: "^8.1.4",
  typescript: "^5.9.3",
  nodeTypes: "^25.8.0",
  vitest: "^4.1.10",
  jsdom: "^29.1.1",
  eslint: "^10.7.0",
  eslintJs: "^10.0.1",
  typescriptEslint: "^8.63.0",
  eslintConfigPrettier: "^10.1.8",
  prettier: "^3.9.5",
  sassEmbedded: "^1.100.0",
  less: "^4.6.7"
};
