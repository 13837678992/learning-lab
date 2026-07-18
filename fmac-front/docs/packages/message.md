# @fmac/message

消息提示：`success` / `error` / `warning` / `info` / `confirm`（适配器）。包内 [README](../../packages/message/README.md)。

```js
import { message } from '@fmac/core';
message.success('保存成功');
if (await message.confirm('确认删除？')) {
  await request.delete('/api/item/1');
}
```

## 约束

- 业务禁止直接 `this.$message`（第十二节）。
- UI 呈现由 `@fmac/ui-adapter` 提供、`core` 注入；接入 ElementUI 时替换适配器即可。
