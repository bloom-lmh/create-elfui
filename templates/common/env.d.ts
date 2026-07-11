/// <reference types="vite/client" />

declare module "*.css?inline" {
  const css: string;
  export default css;
}

declare module "*.scss?inline" {
  const css: string;
  export default css;
}

declare module "*.less?inline" {
  const css: string;
  export default css;
}
