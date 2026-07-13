# create-elfui

ElfUI 官方 Vite 项目脚手架。它可以创建 ElfUI 应用、组件库，并为现有项目生成组件或按需添加工具链能力。

## 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- 推荐使用 pnpm，也支持 npm、Yarn 与 Bun

## 快速开始

创建项目并安装依赖：

```bash
pnpm create elfui@beta my-app --install
```

随后启动开发服务器：

```bash
cd my-app
pnpm dev
```

不添加额外参数时，脚手架会进入交互模式。可以选择 TypeScript 或 JavaScript、Macro 或 Chain 组件模式、CSS/SCSS/Less、Router、测试、代码规范与 CI。

交互式多选题支持方向键移动、空格切换、`a` 全选、回车确认。

## 常用创建方式

### 推荐配置

使用默认应用模板与推荐选项，适合快速启动：

```bash
pnpm create elfui@beta my-app --default --install
```

创建完成后立刻运行开发服务器：

```bash
pnpm create elfui@beta my-app --start
```

创建、安装、启动并自动打开浏览器：

```bash
pnpm create elfui@beta my-app --open
```

### 无交互创建

CI、脚本或团队统一模板可使用显式选项：

```bash
pnpm create elfui@beta my-app \
  --no-interactive \
  --language ts \
  --component macro \
  --style scss \
  --router \
  --router-mode history \
  --vitest \
  --eslint \
  --prettier \
  --package-manager pnpm \
  --install
```

`--no-interactive` 必须同时提供项目目录。使用 `--default` 时会采用推荐配置；未指定功能时也可以结合 `--no-interactive` 创建最小可运行项目。

### Bare 最小项目

Bare 项目不生成演示页面与教学内容，适合作为业务项目的干净起点：

```bash
pnpm create elfui@beta my-app --bare --no-interactive --install
```

### 组件库模板

创建一个可发布的组件库：

```bash
pnpm create elfui@beta my-components \
  --template library \
  --package-name @scope/my-components \
  --default \
  --install
```

查看可用模板：

```bash
pnpm create elfui@beta --list-templates
```

## 内置与用户预设

内置预设：

- `recommended`：推荐应用配置
- `minimal`：最小 Bare 配置
- `quality`：带 Vitest 的质量基线

```bash
# 使用内置预设
pnpm create elfui@beta my-app --preset quality --router --install

# 将当前选择保存为个人预设
pnpm create elfui@beta my-app --save-preset work

# 复用、查看或删除个人预设
pnpm create elfui@beta my-app --use-preset work --install
pnpm create elfui@beta --list-presets
pnpm create elfui@beta --delete-preset work
```

交互创建的最后一步也可以保存个人预设。预设只保存在本机，不会写入项目或提交到 Git。

## Router、测试与 CI

```bash
# Hash Router 是默认模式；History 模式需要部署服务器回退到 index.html
pnpm create elfui@beta my-app --router --router-mode history --install

# 添加 Vitest 和 Playwright E2E
pnpm create elfui@beta my-app --vitest --playwright --install

# 生成 GitHub Actions CI
pnpm create elfui@beta my-app --github-actions --install
```

选择 Playwright 后，请在生成项目中按 README 指引安装 Chromium 浏览器。

## 在已有项目中使用

在项目根目录执行以下命令：

```bash
# 根据当前项目自动识别 Macro / Chain、语言和样式方案
pnpm dlx create-elfui@beta generate component UserCard

# 指定目录、样式或仅预览文件变更
pnpm dlx create-elfui@beta generate component UserCard --dir src/ui
pnpm dlx create-elfui@beta generate component UserCard --style scss --dry-run

# 按需补充能力
pnpm dlx create-elfui@beta add router --router-mode history
pnpm dlx create-elfui@beta add vitest
pnpm dlx create-elfui@beta add prettier
pnpm dlx create-elfui@beta add github-actions --dry-run
```

## 常用选项

| 选项                            | 说明                           |
| ------------------------------- | ------------------------------ |
| `--language ts\|js`             | 选择 TypeScript 或 JavaScript  |
| `--component macro\|chain`      | 选择 ElfUI 组件编写方式        |
| `--style css\|scss\|less\|none` | 选择样式方案                   |
| `--router`                      | 加入 `@elfui/router`           |
| `--router-mode hash\|history`   | 设置 Router 模式               |
| `--vitest` / `--playwright`     | 加入单元测试或 E2E 测试        |
| `--eslint` / `--prettier`       | 加入代码检查或格式化           |
| `--github-actions`              | 生成 GitHub Actions CI         |
| `--no-git`                      | 不初始化 Git 仓库              |
| `--no-install`                  | 仅生成文件，不安装依赖         |
| `--force`                       | 清理非空目标目录后继续         |
| `--dry-run`                     | 输出配置和文件清单，不写入磁盘 |

查看全部参数：

```bash
pnpm create elfui@beta --help
```

## npm 用法

也可以使用 npm：

```bash
npm create elfui@beta my-app -- --install
```

生成后进入项目目录并运行 `npm run dev`。

## 开发脚手架

```bash
pnpm install
pnpm verify
```

发布前还会运行真实 pnpm/npm 消费者项目的安装、类型检查、测试与 Vite 生产构建。
