# @fmac/request

统一请求能力：`get` / `post`（隔离 axios / fetch 实现）。

> 依赖：`@fmac/shared`。所有请求统一走本包，**禁止业务直接调用 `axios()` / `fetch()`**（见 `CLAUDE.md` 第十一节）。

## 设计

通过可替换的 **adapter** 做依赖倒置：默认使用浏览器原生 `fetch`，未来可 `setAdapter()` 换成 axios 实现，业务代码无感知。请求 / 响应均支持拦截器。

## API

| 方法                                                                | 说明                                          |
| ------------------------------------------------------------------- | --------------------------------------------- |
| `request.get(url, config?)`                                         | GET，`config.params` 为查询参数               |
| `request.post(url, data?, config?)`                                 | POST，`data` 为请求体（对象自动 JSON 序列化） |
| `request.put(url, data?, config?)` / `request.delete(url, config?)` | 补充的 REST 方法                              |
| `request.useRequestInterceptor(fn)`                                 | 追加请求拦截器 `(config) => config`           |
| `request.useResponseInterceptor(fn)`                                | 追加响应拦截器 `(result, config) => result`   |
| `request.setAdapter(fn)`                                            | 替换底层适配器                                |
| `request.setBaseURL(url)` / `request.setHeader(name, value)`        | 运行时配置                                    |
| `request.create(options)`                                           | 派生独立实例                                  |

```js
import request from '@fmac/request';

request.setBaseURL('/gateway');
request.useResponseInterceptor((res) => res); // 统一解包 / 错误处理
const users = await request.get('/users', { params: { page: 1 } });
```

> 默认返回响应体 `data`；非 2xx 抛出 `RequestError`（含 `status` / `data`）。
