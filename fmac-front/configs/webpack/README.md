# configs/webpack

**预留目录**。当前平台统一使用 Vite（见各 app 的 `vite.config.js`）。

本目录为未来支持 **webpack / Module Federation** 子应用预留：`base.js` 提供返回纯配置对象的
`createBaseConfig()`（不直接依赖 webpack），实际接入 webpack 时在其基础上扩展 `module` /
`plugins` / `devServer`，并补充 qiankun 所需的 UMD 输出与跨域配置。
