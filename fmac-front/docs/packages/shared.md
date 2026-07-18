# @fmac/shared

框架无关基础层：工具 / 日志 / 断言 / 事件原语 / Hook / 统一异常。**不依赖任何其它 package**。包内 [README](../../packages/shared/README.md)。

## 导出

| 分类     | 导出                                                             |
| -------- | ---------------------------------------------------------------- |
| 常量     | `NAMESPACE` / `KEY_PREFIX`                                       |
| 类型     | `isNil` / `isFunction` / `isString` / `isObject` / `isPromise` … |
| 工具     | `noop` / `identity` / `toArray`                                  |
| 日志     | `createLogger` / `setDebug` / `isDebug`                          |
| 断言     | `assert`                                                         |
| 事件原语 | `createEmitter`（event / store / auth / tab / router 复用）      |
| Hook     | `createHooks`                                                    |
| 异常     | `createErrorHandler` / `ErrorTypes`                              |

`createEmitter` 是平台订阅能力的复用基石；`createHooks` / `createErrorHandler` 支撑 `core` 的统一 Hook 与异常机制。
