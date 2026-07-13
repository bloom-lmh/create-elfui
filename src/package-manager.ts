import { spawn } from "node:child_process";

export const packageManagers = ["pnpm", "npm", "yarn", "bun"] as const;

export type PackageManager = (typeof packageManagers)[number];

export interface PackageManagerCommand {
  command: string;
  args: string[];
}

const isPackageManager = (value: string): value is PackageManager =>
  packageManagers.includes(value as PackageManager);

export const inferPackageManager = (
  userAgent = process.env.npm_config_user_agent ?? "",
): PackageManager => {
  const candidate = userAgent.split(" ")[0]?.split("/")[0] ?? "";
  return isPackageManager(candidate) ? candidate : "pnpm";
};

export const getInstallCommand = (
  packageManager: PackageManager,
): PackageManagerCommand => ({
  command: packageManager,
  args: ["install"],
});

export const getDevCommand = (
  packageManager: PackageManager,
  open = false,
): PackageManagerCommand => {
  const command =
    packageManager === "npm"
      ? { command: "npm", args: ["run", "dev"] }
      : { command: packageManager, args: ["dev"] };
  if (!open) return command;

  return {
    command: command.command,
    args:
      packageManager === "yarn"
        ? [...command.args, "--open"]
        : [...command.args, "--", "--open"],
  };
};

export const formatCommand = ({
  command,
  args,
}: PackageManagerCommand): string => [command, ...args].join(" ");

export const requiresPackageManagerShell = (
  platform = process.platform,
): boolean => platform === "win32";

export const runInstall = async (
  cwd: string,
  packageManager: PackageManager,
): Promise<void> => {
  const { command, args } = getInstallCommand(packageManager);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: requiresPackageManagerShell(),
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${formatCommand({ command, args })} 执行失败，退出码：${code ?? "unknown"}`,
          ),
        );
    });
  });
};

export const runDevServer = async (
  cwd: string,
  packageManager: PackageManager,
  open: boolean,
): Promise<void> => {
  const { command, args } = getDevCommand(packageManager, open);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: requiresPackageManagerShell(),
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 || signal === "SIGINT") resolve();
      else {
        reject(
          new Error(
            `${formatCommand({ command, args })} 执行失败，退出码：${code ?? "unknown"}`,
          ),
        );
      }
    });
  });
};
