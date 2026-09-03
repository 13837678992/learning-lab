# Crud 配置化 CRUD 组件（单文件版）

基于 **Element UI** 的配置化 CRUD 组件，整合为**单个 `index.vue` 文件**（原多文件版 `index.vue` + `form.vue` + `render.vue` + `method.js` + `index.scss` 的合并优化版）。通过一份 `crudConfig` 配置即可生成：查询表单、数据表格、分页、新增/编辑/详情弹窗、单行/批量删除、下载、上传等完整功能。

## 特性

- 纯配置驱动：查询表单、表格列、操作按钮、请求地址全部由 `crudConfig` 描述
- 内置查询/重置/新增/下载/上传/批量删除按钮，内置删除/修改/详情/自定义表格操作按钮
- 查询表单支持 17 种控件类型（含下拉树 `selectTree`、级联、日期区间联动禁用等）
- 动态表单校验（required/rules/自定义 validator）、提交前"未修改"检测
- 分页、前端排序、行多选（支持跨页保留）、自定义渲染列、长文本展开列、行展开插槽
- 表格 Loading 状态、空数据/错误提示、请求异常统一处理
- 请求层可插拔：内置 fetch 实现（零依赖），也可通过 `request` prop 注入 axios 等自定义实现
- 不依赖 Vuex / lodash：字典既支持 Vuex `$store` 的 `dictList`，也支持列配置直接传 `selectList`

## 依赖

| 依赖 | 用途 |
|---|---|
| element-ui | 组件模板全部基于 Element UI（含 `v-loading`、`$message`、`$confirm`） |
| dayjs | 日期区间联动禁用（`pickerOptions`，由共享表单组件 Form 使用） |
| sass（devDependency） | 组件样式为 scss，仅构建期需要 |

> 表单渲染由共享组件 [`Form`](../Form/README.md) 提供，无需 vue 全量构建或额外别名配置。

## 快速开始

```js
// main.js
import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI)
```

```vue
<template>
  <Crud ref="crud" :crud-config="crudConfig" @expand-change="onExpandChange" />
</template>

<script>
import Crud from './components/Crud/index.vue'

export default {
  components: { Crud },
  data() {
    return {
      crudConfig: {
        formConfig: {
          queryFormConfig: {
            buttonShowList: ['query', 'reset', 'add', 'mulDelete'],
            formList: [
              { prop: 'name', label: '姓名', type: 'input' },
              {
                prop: 'status',
                label: '状态',
                type: 'select',
                selectList: [
                  { key: '1', val: '启用' },
                  { key: '0', val: '禁用' },
                ],
              },
            ],
          },
          addFormConfig: {
            formList: [
              { prop: 'name', label: '姓名', type: 'input', required: true },
              { prop: 'age', label: '年龄', type: 'inputNumber' },
            ],
          },
          modFormConfig: { formList: [/* 同新增,可加隐藏 id 字段 */] },
          detailFormConfig: { formList: [/* 详情,自动隐藏提交按钮 */] },
        },
        tableConfig: {
          rowKey: 'id',
          needTableMul: true,
          tableColumns: [
            { prop: 'id', label: 'ID', minWidth: 70 },
            { prop: 'name', label: '姓名', sortable: true },
            { prop: 'status', label: '状态', needGetVal: true, selectList: [{ key: '1', val: '启用' }, { key: '0', val: '禁用' }] },
          ],
          tableButtonList: ['detail', 'mod', 'del'],
        },
        urlConfig: {
          queryUrlConfig: { url: '/api/user/list', type: 'get' },
          addUrlConfig: { url: '/api/user/add', type: 'post' },
          modUrlConfig: { url: '/api/user/mod', type: 'post' },
          delUrlConfig: { url: '/api/user/del', type: 'delete', data: 'id' },
          mulDelUrlConfig: { url: '/api/user/mulDel', type: 'post', data: 'id' },
        },
      },
    }
  },
  mounted() {
    this.$refs.crud.submit() // 手动触发首次查询
  },
}
</script>
```

完整可运行示例见 `src/demo/CrudDemo.vue`（内存 mock 数据，覆盖全部功能）。

## 组件架构（共享模块）

`Crud` 不再内置表单实现，而是复用共享表单组件 [`Form`](../Form/README.md)：

```
src/components/
├── Crud/           # 表格/分页/请求/弹窗 + 复用 Form
└── Form/           # 共享表单核心(17 种控件/校验/异步缓存/联动/条件必填)
```

- 查询表单与新增/修改/详情弹窗表单均由 `Form` 渲染，`formList` 等配置直接透传，字段语义与 [`Form` 文档](../Form/README.md) 一致
- Crud 通过 `buttons` prop 向 `Form` 注入 CRUD 专属按钮注册表：`query`（查询）、`reset`（重置）、`add`（新增）、`download`（下载 excel）、`download1`（下载模板）、`upload`（上传）、`mulDelete`（批量删除）、`commonForm`（自定义表单按钮）
- 按钮 `method` 调用契约：`this` 为 Form 组件实例（可通过 `this.$parent` 访问 Crud），参数 `(buttonItem, form, formList)`
- 表格/分页/请求/删除等 CRUD 逻辑保留在 Crud 自身；Crud 与 Form 各自的单文件均可独立拷贝使用

## Props

| Prop | 类型 | 必填 | 说明 |
|---|---|---|---|
| `crudConfig` | Object | 是 | 组件全部配置，结构见下文 |
| `request` | Function | 否 | 自定义请求函数，签名 `(config) => Promise<{ data }>`，`config` 为 axios 风格对象 `{ url, method, params, data, headers, responseType, timeout }`。不传时使用内置 fetch 实现 |

## Events

| 事件 | 参数 | 说明 |
|---|---|---|
| `expand-change` | `row` | 表格行展开时触发（需配置 `tableConfig.needTableExpand` 与 `expandName` 插槽） |

## Slots

| 插槽 | 说明 |
|---|---|
| 具名插槽 `expandName` | 表格行展开内容，`slot-scope="{ row }"`，名称由 `tableConfig.expandName` 指定 |
| 具名插槽 `x.slotName` | 公共表单字段旁的自定义内容，在 `formList` 项上配置 `slotName`，`slot-scope="{ row }"`（`row` 为 `{ item, form }`） |

## crudConfig 结构

```
crudConfig
├── formConfig
│   ├── queryFormConfig      查询表单（含查询按钮区）
│   ├── addFormConfig        新增表单（name + "FormConfig" 自动映射）
│   ├── modFormConfig        修改表单
│   └── detailFormConfig     详情表单（自动隐藏"确定"按钮）
├── tableConfig              表格配置
└── urlConfig                请求配置（每个都支持对象或函数形式）
```

### formConfig：表单配置通用字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `labelWidth` | Number | 标签宽度，不传按内容自动计算 |
| `labelPosition` | String | 标签位置，默认 `right` |
| `formList` | Array | 表单项配置，见下表 |
| `buttonShowList` | Array | 按钮区按钮，字符串（内置名）或对象 `{ name, buttonName, showMethod, method, disabled }` |
| `defaultForm` | Object | 默认值（新增表单），`defaultForm` 中未在 `formList` 声明的字段不会进入表单模型 |
| `needNumPropList` | Array | 提交/查询前转 Number 的字段名列表 |
| `submitMethod` | Function | 存在时替代默认提交请求，`(query[, rowIndex])` |
| `dataTran` | Function | 查询响应数据转换，`(dataArray) => newArray` |
| `mounMeth` | Function | 查询响应后钩子，`this` 指向组件，`(tableData) => newTableData` |
| `needSubmit` / `needReset` | Boolean | 控制弹窗底部"确定/重置"按钮显隐（注意 `needReset == false` 时显示重置按钮，历史约定） |
| `isHaveSlot` | Boolean | 弹窗表单是否转发具名插槽 |

**`formList` 表单项字段**

| 字段 | 说明 |
|---|---|
| `type` | 控件类型：`input` / `textarea` / `password` / `inputNumber` / `select` / `selectTree` / `cascader` / `date` / `year` / `month` / `time` / `dateTime` / `radioGroup` / `checkBox` |
| `prop` / `label` | 字段名 / 标签 |
| `required` | 必填，布尔或函数 `(item, form) => bool` |
| `rules` | 自定义校验规则数组（async-validator 规则，`validator` 会追加表单对象参数） |
| `placeholder` / `width` / `class` | 占位符 / 宽度 / class |
| `disabled` | 布尔或函数（控件置灰） |
| `reg` | 正则，input 时过滤非法字符 |
| `multiple` / `maxlength` / `showWordLimit` | 控件通用属性 |
| `min` / `max` / `precision` / `controls` / `allowNegative` | inputNumber 属性 |
| `minRows` / `maxRows` | textarea 行数 |
| `selectList` / `tcKey` | 下拉选项：直接数组 `[{key, val}]`，或 Vuex `$store.state.common.dictList` 的 key |
| `showKey` | 下拉/树显示 `key: val` |
| `remote` / `remoteMethod` | 远程搜索 |
| `focusMethod` / `inputMethod` / `blurMethod` / `changeMethod` / `clearMethod` | 各事件回调，`(value, form, formList, ref)` |
| `cache` | 数组：focusMethod 结果按这些字段值缓存 |
| `slotName` | 控件旁的具名插槽名 |
| `showMethod` | 布尔或函数，控制表单项显隐（编辑表单隐藏 id 字段可设 `showMethod: false`） |
| `needString` | 查询/提交前数组值 join(",")（select/checkBox） |
| `valueFormat` | 日期类控件格式（date 默认 `yyyyMMdd`，dateTime 默认 `yyyyMMddHHmmss`，time 默认 `HHmmss`） |
| `isStartDate` / `isEndDate` / `startDateProp` / `endDateProp` | 日期区间联动：开始/结束日期互相限制 |
| `disabledDateNum` / `dateUnit` | 区间跨度限制（数量 / `day` 或 `year`） |
| `noCheckDate` | 关闭日期限制 |
| `disabledMethods` | 额外禁用日期函数 `(yyyymmdd) => bool` |
| `nodeKey` / `labelProp` / `childrenProp` / `treeData` / `nodeClickMethod` | selectTree 专用 |
| `radioGroupList` / `checkBoxList` | 单选/多选选项 `[{key, val}]` |
| `expandTrigger` / `data` | cascader 专用 |

**`buttonShowList` 内置按钮**

| name | 说明 |
|---|---|
| `query` | 查询（先校验，再触发列表刷新并回到第 1 页） |
| `reset` | 重置（仅清空表单，不自动查询） |
| `add` | 打开新增弹窗 |
| `download` | 下载 excel（请求期间按钮置灰） |
| `download1` | 下载模板（`mouldName` 指定静态文件名） |
| `upload` | 打开上传弹窗（xlsx/xls） |
| `mulDelete` | 批量删除 |
| `commonForm` / `default` / `defaultValidate` | 自定义/默认按钮 |
| 任意对象 | `{ name, buttonName, method, showMethod, disabled }`，`method(form, formList)` |

### tableConfig：表格配置

| 字段 | 说明 |
|---|---|
| `tableColumns` | 列配置数组，见下表 |
| `rowKey` | 行主键（多选跨页保留、行展开需要） |
| `needTableMul` | 是否显示多选列 |
| `reserveSelection` | 跨页保留选择，默认 `true`（需 rowKey） |
| `needTableButton` | 是否显示操作列 |
| `tableButtonList` | 操作按钮：字符串（内置名）或对象 `{ name, buttonName, method, showMethod, disabled }` |
| `tableConfigOpName` | 操作列标题，默认"操作" |
| `needTableExpand` / `expandName` | 行展开列及展开内容插槽名 |
| `needPage` | 是否分页，默认 `true` |
| `needCheckMod` | 修改提交前"未修改"检测，默认 `true` |
| `tableClass` | 表格附加 class |
| `needRowsDrap` | 拖拽行（当前仅样式，未实现拖拽逻辑） |

**`tableColumns` 列字段**

| 字段 | 说明 |
|---|---|
| `prop` / `label` | 字段名 / 列标题 |
| `sortable` | 前端排序（仅排序当前页数据） |
| `fixed` | `left` / `right` 固定列 |
| `minWidth` | 最小宽度；不传则按内容自适应（`flexColumnWidth`，上限 260px） |
| `className` | 单元格 class |
| `needGetVal` | 码值转义，配合 `tcKey`（Vuex 字典）或 `selectList`（内联字典），多值用 `,` 或 `.` 分隔 |
| `needAddDate` / `needAddTime` | `20260701` → `2026-07-01` / `093000` → `09:30:00` |
| `needGetDate` / `needGetDateTime` | 时间戳 → 日期 / 日期时间字符串 |
| `render` | 自定义渲染 `(h, { row, index }) => VNode` |
| `expand` | 长文本展开列（数据需带 `${prop}Btn: true` 才显示展开按钮） |

**`tableButtonList` 内置按钮**

| name | 说明 |
|---|---|
| `del` | 删除（二次确认） |
| `mod` | 打开修改弹窗 |
| `detail` | 打开详情弹窗（无提交按钮） |
| `common` | 默认按钮，需自定义 `method` |
| 任意对象 | `{ name, buttonName, method, showMethod, disabled }`，`method(row, index)` |

### urlConfig：请求配置

`crudConfig` 中的 `addFormConfig` 自动对应 `addUrlConfig`（`name + "UrlConfig"` 映射）。

每个配置支持两种形式：

```js
// 对象形式
queryUrlConfig: { url: '/api/user/list', type: 'get', timeout: 30000, needRequestHeader: true, data: { extra: 1 } }
// 函数形式:接收表单参数,返回配置对象
queryUrlConfig: query => ({ url: '/api/user/list', type: 'get' })
```

| 配置 | 说明 |
|---|---|
| `queryUrlConfig` | 列表查询（GET 参数自动携带表单值 + `pageSize` / `pageNum`） |
| `addUrlConfig` / `modUrlConfig` / `detailUrlConfig` | 新增/修改/详情提交（POST body 为表单模型；`data` 字段会合并进请求参数） |
| `delUrlConfig` | 单行删除。`data` 字段控制参数提取：`data: 'id'` → `{ id: row.id }`；`data: ['a','b']` → `{ a: row.a, b: row.b }`；不配 `data` → 整行作为参数 |
| `mulDelUrlConfig` | 批量删除（未配置时回退复用 `delUrlConfig`，逐行串行请求） |
| `downloadUrlConfig` | 下载导出（blob，携带查询条件） |
| `uploadUrlConfig` | 上传导入（FormData，`prop` 指定文件名，默认 `file`） |

通用字段：`url`、`type`（get/post/put/delete）、`timeout`、`needRequestHeader`（true 时 post 参数放 query）、`data`（合并进参数）。

## 请求与数据约定

- 响应结构：`{ errorCode: '000000', data: Array|any, total: Number, message/errorMsg: String }`，`errorCode === '000000'` 视为成功
- 分页参数：`pageSize` / `pageNum`（第 1 页从 1 开始）
- 内置 fetch 实现行为：GET/DELETE 参数走 query string；POST/PUT 走 JSON body（`needRequestHeader: true` 时走 query）；FormData 走 multipart；`responseType: 'blob'` 返回 Blob；支持 `timeout`（AbortController）
- 自定义 `request` 函数需返回 Promise，resolve 值为 `{ data: 响应体 }`（axios 风格）

## 通过 $refs 访问的方法

| 方法 | 说明 |
|---|---|
| `submit()` | 回到第 1 页并查询（挂载后手动触发首次查询） |
| `queryTableData()` | 按当前条件刷新列表 |
| `mulDelete()` | 批量删除 |
| `getVal(listOrTcKey, value)` / `getCode(dictKey, value)` | 码值互转（兼容 Vuex `dictList`） |
| `getDate / getDateTime / addDate / addTime / delDate / addZero` | 日期时间格式化工具 |
| `desMethods(str, type)` | 脱敏（`name` 姓名 / `tel` 手机号 / 不传全掩码） |

## Demo

`src/demo/CrudDemo.vue` 提供完整可运行示例：内存 mock 数据 + 自定义 `request` mock 函数，覆盖查询（姓名模糊/状态/日期区间）、分页、前端排序、新增、编辑、详情、删除、批量删除、下载、上传、自定义渲染列、长文本展开列，以及：

- **日期区间跨度限制**：开始/结束日期通过 `disabledDateNum: 30, dateUnit: 'day'` 限制为 30 天内（`dateUnit: 'year'` 可按年限制）
- **下拉异步加载与缓存**：产品类型/地区下拉通过 `focusMethod` 异步加载；产品下拉 `cache: ['productCategory']` 按类型缓存、城市下拉 `cache: ['region']` 按地区缓存（页面顶部蓝色文字实时显示字典接口调用次数，可直观验证缓存生效）
- **查询条件联动**：产品类型变更清空产品（`changeMethod`）；地区变更清空城市；未选地区时城市隐藏（`showMethod`）
- **函数式条件必填**：`required: (item, form) => bool` —— 选了产品类型后产品必填、选了地区后城市必填（查询被拦截并滚动到错误项）；新增表单中状态为"禁用"时备注必填

示例（异步加载 + 缓存 + 联动 + 条件必填）：

```js
{
  prop: 'productCategory',
  label: '产品类型',
  type: 'select',
  focusMethod: () => fetchDict('/dict/productCategory'),          // 首次聚焦异步加载
  changeMethod: (value, form) => { form.product = '' }            // 联动:清空已选产品
},
{
  prop: 'product',
  label: '产品',
  type: 'select',
  cache: ['productCategory'],                                     // 按产品类型缓存
  focusMethod: (value, form) => fetchDict('/dict/products', { category: form.productCategory }),
  required: (item, form) => !!form.productCategory                // 条件必填
},
{
  prop: 'startDate',
  label: '开始日期',
  type: 'date',
  isStartDate: true,
  endDateProp: 'endDate',
  disabledDateNum: 30,                                            // 跨度限制 30 天
  dateUnit: 'day'
}
```

> `focusMethod` 需返回 `Promise<[{key, val}]>` 的选项列表；组件内置按 `cache` 声明的依赖字段值缓存结果（`$set` 响应式更新下拉选项）。

启动：`npm run dev` 后访问 http://localhost:3100 。刷新页面数据重置。

## 与旧多文件版本的差异

1. 合并为单文件 `index.vue`（原 `form.vue`/`render.vue`/`method.js`/`index.scss` 已并入）
2. 移除对宿主模块 `@/settings`、`@/utils/request`、`@/api/api_header_conf` 的依赖：超时改为内置默认 60000ms（可用每个 urlConfig 的 `timeout` 覆盖），请求改为内置 fetch + 可选 `request` prop
3. 移除 `$lodash` 依赖：内置 `cloneDeep`（保留函数引用、处理 Date/循环引用）
4. `Vuex $store` 字典仍兼容（存在时使用），同时支持 `selectList` 内联字典
5. 请求行为修正：GET/DELETE 一律走 query 参数（旧版在 `needRequestHeader == true` 强转下会把 GET 参数放进请求体，不符合常规后端约定）
6. `method.js` 的模块级导出（getVal 等）不再对外导出，改为组件方法（`$refs` 可访问）
7. `process.env` 访问改为安全兼容（Vite 浏览器端无 process 不再报错）
8. 表单渲染由共享组件 `Form`（`src/components/Form`）提供，不再内置运行时编译的表单模板，无需 vue 全量构建别名

## 已知限制

- `needRowsDrap` 仅提供拖拽样式，未实现行拖拽逻辑
- 前端排序只作用于当前页数据（Element UI 客户端排序行为）
- 表格空数据时序号/多选/展开列会隐藏（列布局会有跳动，历史行为）
- 数字 `0` 在普通列中显示为 `-`（`!!value` 判断，历史约定）
