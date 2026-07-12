# create-elfui

ElfUI 官方 Vite 项目脚手架。

```bash
pnpm create elfui@beta my-app --install
```

不传 `--default` 或组件、样式、Router 等功能选项时，CLI 会进入交互式配置；`--install` 只控制是否安装依赖，不会跳过提问。Macro 项目会显式声明 `@elfui/core` 与 `@elfui/runtime`，兼容 pnpm 的严格依赖解析。

```bash
# CI 或自动化：不显示提问，未指定项使用默认配置
pnpm create elfui@beta my-app --no-interactive --install

# 默认初始化 Git；不需要时关闭
pnpm create elfui@beta my-app --default --no-git
```
