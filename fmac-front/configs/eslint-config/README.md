# @fmac/eslint-config

FMAC Front 统一 ESLint 扁平配置（Flat Config）基线。

## 特点

- **框架无关**：不绑定任何 UI / 应用框架；框架相关规则由具体 app 叠加。
- **只管质量，不管格式**：格式化交给 Prettier，末尾接 `eslint-config-prettier` 关闭冲突规则。
- **统一 ES Module**。

## 用法

```js
// eslint.config.js
import base from '@fmac/eslint-config';

export default [
  ...base,
  // 如需扩展，在此追加规则；禁止另立与基线冲突的配置。
];
```

> 需要宿主提供 `eslint >= 9`（peerDependency）。
