# create-elfui

ElfUI 官方 Vite 项目脚手架。

```bash
pnpm create elfui@beta my-app --install
```

不传 `--default`、`--preset` 或组件、样式、Router 等功能选项时，CLI 会进入交互式配置；`--install` 只控制是否安装依赖，不会跳过提问。Macro 项目会显式声明 `@elfui/core` 与 `@elfui/runtime`，兼容 pnpm 的严格依赖解析。

```bash
# CI 或自动化：不显示提问，未指定项使用默认配置
pnpm create elfui@beta my-app --no-interactive --install

# 默认初始化 Git；不需要时关闭
pnpm create elfui@beta my-app --default --no-git

# 预设：recommended（默认）、minimal（Bare）、quality（含 Vitest）
pnpm create elfui@beta my-app --preset quality --router --install

# history 路由：生产服务器需要将未知路径回退到 index.html
pnpm create elfui@beta my-app --router-mode history --install

# Playwright E2E：创建后按 README 显式安装 Chromium
pnpm create elfui@beta my-app --playwright --install
```
