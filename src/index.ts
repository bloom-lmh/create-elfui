import { cancel } from "@clack/prompts";
import chalk from "chalk";

import { runCli } from "./cli";
import { UserCancelledError } from "./errors";

runCli().catch((error: unknown) => {
  if (error instanceof UserCancelledError) {
    cancel(error.message);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`ElfUI 命令执行失败：${message}`));
  process.exitCode = 1;
});
