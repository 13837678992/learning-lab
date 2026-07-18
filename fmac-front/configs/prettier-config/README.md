# @fmac/prettier-config

FMAC Front 统一 Prettier 配置。

## 用法

在 `package.json` 中引用（根已配置）：

```json
{
  "prettier": "@fmac/prettier-config"
}
```

作为唯一格式化配置源，各 app / package 不应再自定义冲突的 Prettier 规则。
