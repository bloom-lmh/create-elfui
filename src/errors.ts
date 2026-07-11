export class UserCancelledError extends Error {
  public constructor() {
    super("已取消创建项目。");
    this.name = "UserCancelledError";
  }
}

export class TargetDirectoryNotEmptyError extends Error {
  public constructor(target: string) {
    super(`目标目录不为空：${target}。请换一个目录，或显式传入 --force。`);
    this.name = "TargetDirectoryNotEmptyError";
  }
}

export class InvalidOptionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidOptionError";
  }
}
