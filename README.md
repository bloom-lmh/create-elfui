# create-elfui

ElfUI 官方 Vite 项目脚手架。

```bash
pnpm create elfui@beta my-app --install
```

不传 `--default` 或组件、样式、Router 等功能选项时，CLI 会进入交互式配置；`--install` 只控制是否安装依赖，不会跳过提问。Macro 项目会显式将 Vite 编译器的宏和运行时入口配置为 `@elfui/core`。
