# create-elfui

ElfUI 官方 Vite 项目脚手架。

```bash
pnpm create elfui@beta my-app --install
```

可用模板：`app`（默认应用）与 `library`（可发布的组件库）。

不传 `--default`、`--preset` 或组件、样式、Router 等功能选项时，CLI 会进入交互式配置；`--install` 只控制是否安装依赖，不会跳过提问。Macro 项目会显式声明 `@elfui/core` 与 `@elfui/runtime`，兼容 pnpm 的严格依赖解析。

```bash
# CI 或自动化：不显示提问，未指定项使用默认配置
pnpm create elfui@beta my-app --no-interactive --install

# 默认初始化 Git；不需要时关闭
pnpm create elfui@beta my-app --default --no-git

# 列出模板，或创建可发布的组件库
pnpm create elfui@beta --list-templates
pnpm create elfui@beta my-components --template library --package-name @scope/my-components --default --install

# 预设：recommended（默认）、minimal（Bare）、quality（含 Vitest）
pnpm create elfui@beta my-app --preset quality --router --install

# history 路由：生产服务器需要将未知路径回退到 index.html
pnpm create elfui@beta my-app --router-mode history --install

# Playwright E2E：创建后按 README 显式安装 Chromium
pnpm create elfui@beta my-app --playwright --install

# GitHub Actions：按当前选择生成 CI 步骤
pnpm create elfui@beta my-app --github-actions --install

# 保存、复用与管理个人常用配置
pnpm create elfui@beta my-app --save-preset work
pnpm create elfui@beta my-app --use-preset work --install
pnpm create elfui@beta --list-presets
pnpm create elfui@beta --delete-preset work
# 交互创建时也可在最后一步保存为用户预设，下一次会在“配置预设”中出现

# 在已有项目中生成组件：自动识别 Macro / Chain、语言、样式和 Vitest
pnpm dlx create-elfui@beta generate component UserCard
pnpm exec elfui generate component UserCard --dir src/ui
pnpm exec elfui generate component user-card --style scss --dry-run

# 向已有项目增量添加功能：Router、测试、格式化或 CI
pnpm exec elfui add router --router-mode history
pnpm exec elfui add vitest
pnpm exec elfui add prettier
pnpm exec elfui add github-actions --dry-run
```
