# @fmac/tab

统一多标签页（Tab）管理：跨应用的标签页增删、切换与刷新。

> 依赖：`@fmac/shared`。多标签页状态统一走本包，避免各应用各自维护标签栏。

## 标签记录

`{ key, title, path, closable, meta }` —— 至少提供 `key` 或 `path`。

## API

| 方法                                     | 说明                                                     |
| ---------------------------------------- | -------------------------------------------------------- |
| `tab.add(tab)`                           | 新增（已存在则复用）并激活                               |
| `tab.remove(key)`                        | 移除；自动激活相邻标签                                   |
| `tab.setActive(key)` / `tab.getActive()` | 切换 / 读取当前激活项                                    |
| `tab.list()` / `tab.find(key)`           | 读取标签列表 / 查找                                      |
| `tab.closeOthers(key)`                   | 关闭其它（保留目标与不可关闭项）                         |
| `tab.clear()`                            | 关闭全部可关闭项                                         |
| `tab.refresh(key?)`                      | 请求刷新（发出 refresh 事件）                            |
| `tab.subscribe(handler)`                 | 订阅变更 `({ type, activeKey, tabs })`，返回取消订阅函数 |

```js
import tab from '@fmac/tab';

const off = tab.subscribe(({ tabs, activeKey }) => renderTabBar(tabs, activeKey));
tab.add({ key: '/order', title: '订单管理', path: '/order' });
```
