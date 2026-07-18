# @fmac/message

统一消息提示：`success` / `error` / `warning` / `confirm`（另含 `info`）。

> 依赖：`@fmac/shared`。消息提示统一走本包，**禁止业务直接 `this.$message`**（见 `CLAUDE.md` 第十二节）。UI 呈现经适配器隔离，真实实现由 `@fmac/ui-adapter` 提供、`@fmac/core` 注入。

## API

| 方法                                | 说明                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `message.success(content, config?)` | 成功提示                                                                 |
| `message.error(content, config?)`   | 错误提示                                                                 |
| `message.warning(content, config?)` | 警告提示                                                                 |
| `message.info(content, config?)`    | 普通提示                                                                 |
| `message.confirm(input)`            | 确认框；`input` 为字符串或 `{ content, title }`，返回 `Promise<boolean>` |
| `message.setAdapter(adapter)`       | 注入 UI 适配器 `{ show, confirm }`                                       |

```js
import message from '@fmac/message';

message.success('提交成功');
if (await message.confirm('确认删除该记录？')) {
  await request.delete('/api/item/1');
}
```
