# ConfigTable 配置化表格组件（旧 oldConfigtable 重构版）

基于 **Element UI 2.15.x + Vue 2.7** 的配置化「搜索表单 + 数据表格」组件，由旧版
`src/components/oldConfigtable`（`kconfigtable.vue` + `HDatagrid.vue` + 表单控件族，依赖外部
`h-*`/`u-*` 魔改组件库）重构而来。保留旧组件的核心业务能力，全部改用 Element UI 原生组件实现，
并重新设计了命名与数据结构。

## 1. 基础信息

- **用途**：以配置驱动的方式渲染查询表单、数据表格、分页与行选择，适用于各类“列表 + 查询”页面。
- **适用场景**：服务端分页列表、跨页多选、配置化查询条件；不内置增删改请求逻辑（与 `Crud` 的区别），数据获取完全由调用方控制。
- **依赖**：`element-ui`（全局注册，含 `$message` 等）、`sass`（构建期，样式为 scss）。无其他第三方依赖，无 `$bi`/`$api`/`$lodash` 等全局注入依赖。

### 目录结构与职责

| 文件 | 职责 |
|---|---|
| `index.vue` | 主组件 `ConfigTable`：搜索表单区、工具栏、表格、分页、已选面板、行选择逻辑 |
| `TableColumn.js` | `ConfigTableColumn`：递归列渲染器，把列配置映射为 `el-table-column`（含多级表头、作用域插槽透传） |
| `README.md` | 本文档 |

### 引入方式

```js
// main.js
import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI)
```

```vue
<script>
import ConfigTable from '@/components/ConfigTable/index.vue'
export default { components: { ConfigTable } }
</script>
```

### 基础示例

```vue
<template>
  <ConfigTable
    ref="table"
    :data="rows"
    :columns="columns"
    :search-fields="searchFields"
    :total="total"
    :loading="loading"
    row-key="id"
    @search="load"
  />
</template>

<script>
export default {
  data() {
    return {
      rows: [],
      total: 0,
      loading: false,
      columns: [
        { type: 'selection' },
        { prop: 'name', label: '名称' },
      ],
      searchFields: [{ prop: 'keyword', label: '关键字' }],
    }
  },
  methods: {
    load(params) {
      // params = { keyword, pageNum, pageSize }
    },
  },
}
</script>
```

## 2. 公开 API

### 2.1 Props

#### 数据与列

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|---|---|---|---|---|
| `data` | `Array` | `[]` | 是 | 表格行数据（组件不会修改该数组及行对象） |
| `columns` | `Array` | `[]` | 是 | 列配置，见 2.1.2 |
| `total` | `Number` | `0` | 否 | 总条数（服务端分页时传入） |
| `loading` | `Boolean` | `false` | 否 | 表格加载状态（`v-loading`） |
| `size` | `String` | — | 否 | 表格尺寸：`medium/small/mini` |
| `border` | `Boolean` | `true` | 否 | 纵向边框 |
| `stripe` | `Boolean` | `true` | 否 | 斑马纹 |
| `showHeader` | `Boolean` | `true` | 否 | 显示表头 |
| `highlightCurrentRow` | `Boolean` | `false` | 否 | 点击行高亮（`current-change` 事件配合） |
| `rowClassName` | `Function` | — | 否 | `({ row, rowIndex }) => string`，Element 原生签名 |
| `height` | `String/Number` | — | 否 | 固定高度；传 `'auto'` 表示不限制 |
| `maxHeight` | `String/Number` | — | 否 | 最大高度 |
| `fitHeight` | `Boolean` | `false` | 否 | 自动测量填满视口剩余高度（监听 resize，组件销毁时自动移除） |

#### 行选择

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `rowKey` | `String` | `''` | 行唯一键字段名；`reserve-selection` 与已选面板必需 |
| `reserveSelection` | `Boolean` | `false` | 跨页/数据刷新保留选中（Element 原生 `reserve-selection`，依赖 `rowKey`） |
| `selectable` | `Function` | `null` | **额外**可选性条件 `(row, index) => boolean`，与 `_disabled` 规则取交集；只影响用户勾选路径 |
| `rowClickSelect` | `Boolean` | `true` | 点击行切换勾选（存在选择列时生效；遵守 `_disabled` 规则） |
| `singleSelection` | `Boolean` | `false` | 多选列中限制只保留一个选中项 |
| `defaultSelection` | `Array` | `[]` | 默认选中行对象数组（程序化回显路径，**可以**包含 `_disabled` 行）；变化时整体替换当前选中 |

#### 已选面板（跨页选中辅助）

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `showSelectionPanel` | `Boolean` | `true` | 是否展示“当前已选 N 项”浮层（仅 `reserveSelection + rowKey + 有选中` 时出现） |
| `selectionPanelClearAll` | `Boolean` | `false` | 浮层内是否显示“清空”按钮 |
| `selectionDisplayProps` | `Array` | `[]` | 浮层每行展示的字段名列表；为空时取行前两个字段 |
| `lockedKey` | `Boolean 字段名 String` | `''` | 业务字段名：该字段为 `true` 的已选行在浮层中不显示移除按钮（“选中且锁定”，与 `_disabled` 无关） |

#### 分页

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `showPagination` | `Boolean` | `true` | 显示分页；`true` 时 `search` 载荷自动携带 `pageNum/pageSize` |
| `pageSizes` | `Array` | `[10,20,50,100]` | 每页条数选项 |
| `pagerLayout` | `String` | `'total, sizes, prev, pager, next, jumper'` | Element 分页 layout |
| `initialPage` / `initialPageSize` | `Number` | `1` / `10` | 初始页码/页大小 |

#### 搜索表单

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `searchFields` | `Array` | `[]` | 查询条件配置，见 2.1.1 |
| `searchColumns` | `Number` | `3` | 每行列数（24 栅格均分） |
| `labelWidth` | `String` | `'120px'` | 表单 label 宽度 |
| `showSearchButton` / `showResetButton` | `Boolean` | `true` | 查询/重置按钮显隐 |
| `showMoreButton` | `Boolean` | `true` | 条件超过 `searchColumns*2-1` 个时显示“更多/收起” |
| `searchButtonLoading` | `Boolean` | `false` | 查询按钮在 `loading` 期间显示加载态 |
| `autoSearch` | `Boolean` | `false` | mounted 时自动触发一次 `search` |
| `searchOnFieldsChange` | `String` | `'never'` | `searchFields` 变化后自动查询：`'never' / 'first' / 'always'` |
| `clearSelectionOnQuery` | `Boolean` | `true` | **仅点击“查询”按钮**时清空选中（翻页、回车、外部 `search()` 不清空） |
| `showFilterCheckbox` / `filterCheckboxLabel` | `Boolean` / `String` | `false` / `''` | 按钮区附加复选框及文案 |

#### 2.1.1 searchFields 字段配置

通用键：

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `prop` | `String` | — | 值写入 `searchForm` 的键（范围类字段用 `startProp/endProp` 代替） |
| `label` | `String` | — | 表单项名称 |
| `type` | `String` | `'input'` | 控件类型，见下表；`'text'` 为纯文本展示 |
| `hidden` | `Boolean` | `false` | 隐藏该条件 |
| `defaultValue` | 任意 | — | 默认值；范围类字段传 `[start, end]` |
| `required` | `Boolean` | `false` | 仅控制星号展示（不做校验拦截） |
| `placeholder` / `disabled` / `maxlength` / `clearable` | — | clearable 默认 `true` | 透传 Element 控件 |
| `resetProp` | `String` | — | 本字段有值时自动清空的目标字段 |
| `slot` | `String` | — | 使用具名插槽渲染整个控件，作用域 `{ field, form }` |
| `appendSlot` | `String` | — | 控件后方附加具名插槽 |

各 `type` 专属键：

| type | 专属键 | 说明 |
|---|---|---|
| `input` / `text` | — | 文本输入 / 只读展示 |
| `select` | `options: [{label,value,disabled}]`、`multiple`、`filterable`(默认 true)、`collapseTags`、`checkAll` | `checkAll=true` 且多选时下拉头部提供“全选/反选”（作用于全部未禁用选项） |
| `select-input` | `startProp`、`endProp`、`options` | 下拉+输入组合，两值分别写入 `startProp/endProp` |
| `tree` | `treeData`、`treeProps: {children,label,value}`(默认 `{children:'children',label:'label',value:'value'}`)、`multiple`、`expandAll` | 树形下拉；单选存节点值，多选存节点值数组（父子不联动） |
| `date` | `dateType`('date'/'datetime'/'month')、`format`、`valueFormat`(默认按类型 `yyyy-MM-dd` 等)、`disableFuture`、`maxSpanDays`、`pickerOptions` | 日期选择 |
| `daterange` | `startProp`、`endProp`、`dateType`(range/datetimerange/monthrange)、`format`、`valueFormat`、`disableFuture`、`maxSpanDays`、`pickerOptions` | 日期范围，值拆分写入 `startProp/endProp` |
| `double-input` | `startProp`、`endProp`、`precision`(默认 2)、`allowNegative`、`unit`、`startLimit:{min,max}`、`endLimit:{min,max}`、`extraProp`、`extraOptions`、`extraDefaultValue` | 数字区间 + 单位 + 附带下拉；输入实时清洗（仅数字、单个小数点、限小数位），失焦钳制上下限 |
| `unit-input` | `unit`、`precision`(默认 0) | 数字输入 + 后缀单位 |
| 任意 + `customRange` | `customRange: {startProp,endProp,dateType,format,valueFormat}` | 控件后附“自定义区间”复选框：勾选后主控件禁用、日期可用，值写入 `customRange.startProp/endProp`；取消勾选清空日期值 |

#### 2.1.2 columns 列配置

| 键 | 类型 | 说明 |
|---|---|---|
| `prop` / `label` | `String` | 字段名 / 表头文本 |
| `type` | `String` | `'selection'`（选择列，自动挂 `_disabled` 规则与 `reserve-selection`）/ `'index'`（序号列，分页连续编号）/ `'expand'` |
| `width` / `minWidth` / `align` / `headerAlign` / `fixed` | — | 透传 `el-table-column` |
| `sortable` | `Boolean` | `true` 时编译为 `'custom'`（服务端排序），排序变化通过 `sort-change` 事件交给调用方 |
| `formatter` | `Function` | `(row, column, cellValue, index) => string` |
| `showOverflowTooltip` / `className` / `labelClassName` / `sortBy` / `resizable` / `filters` / `filterMultiple` | — | 透传 |
| `children` | `Array` | 子列数组 → 多级表头分组 |
| `slot` | `String` | 单元格具名插槽，作用域 `{ row, index, column }` |

### 2.2 事件

| 事件 | 触发时机 | 参数 |
|---|---|---|
| `search` | 点击查询、翻页、改页大小、回车、`autoSearch`、`searchOnFieldsChange`、外部调用 `search()` | `(params)`：`{ ...searchForm }`，`showPagination` 时含 `pageNum/pageSize` |
| `reset` | 点击重置（已恢复默认值，不自动查询，由调用方重新 `search`） | `(form)` 重置后的表单副本 |
| `search-change` | 任一查询字段值变化 | `(value, field, form)`：本次变化的值、字段配置、表单副本 |
| `search-form-change` | 查询表单任意值变化（deep） | `(form)` 表单副本 |
| `selection-change` | 选中集合变化（勾选、全选、翻页保留、面板移除、程序化） | `(selection)` 行对象数组 |
| `select` | 用户单击某行复选框（选中或取消均触发） | `(selection, row)` |
| `select-all` | 表头全选/取消 | `(selection)` |
| `row-click` / `row-dblclick` | 行单击/双击（**不受 `_disabled` 影响**） | `(row, column, event)` |
| `current-change` | 高亮行变化（`highlightCurrentRow`） | `(currentRow, oldCurrentRow)` |
| `sort-change` | 排序变化（custom 模式） | `({ column, prop, order })` |
| `filter-checkbox-change` | 按钮区附加复选框变化 | `(checked)` |

### 2.3 方法（通过 `ref` 调用）

| 方法 | 签名 | 说明 |
|---|---|---|
| `search` | `() => void` | 触发一次 `search` 事件（不清空选中） |
| `resetSearch` | `() => void` | 编程式重置 |
| `getSearchParams` | `() => Object` | 当前查询参数（含分页） |
| `getSearchForm` | `() => Object` | 查询表单副本 |
| `getSelectedRows` | `() => Array` | 当前选中行（含跨页保留） |
| `clearSelection` | `() => void` | 清空全部选中（含跨页保留） |
| `setSelection` | `(rows: Array) => void` | **程序化整体替换**选中集合；可包含 `_disabled` 行；行对象不在当前 `data` 中时需 `rowKey` + `reserveSelection` 才能正确回显 |
| `getTable` | `() => VueComponent` | 内部 `el-table` 实例（需要 Element 原生能力时使用） |

### 2.4 插槽

| 插槽 | 作用域参数 | 位置 |
|---|---|---|
| `header` | — | 搜索表单上方（旧 `topContent`） |
| `toolbar` | — | 表格上方左侧按钮区（旧 `btnBar`） |
| `toolbar-right` | — | 表格上方右侧（旧 `rightToolbar`） |
| `search-buttons` | — | 查询/重置按钮后（旧 `formButton`） |
| `empty` | — | 表格空数据（默认“暂无数据”图标文案；旧版图片依赖缺失资源，未迁移） |
| `field.slot` | `{ field, form }` | 自定义整个查询控件 |
| `field.appendSlot` | `{ field, form }` | 查询控件后附加内容 |
| `column.slot` | `{ row, index, column }` | 自定义单元格（行操作按钮等） |

## 3. 数据结构

行数据 = 业务字段 + 少量表格控制字段。组件**只读**行数据，不会写入任何字段。

| 字段 | 类型 | 归属 | 说明 |
|---|---|---|---|
| 业务字段 | 任意 | 业务 | 正常渲染与插槽使用 |
| `rowKey` 指定字段 | 任意唯一 | 表格配置 | 跨页保留/回显/面板去重的行标识 |
| `_disabled` | `Boolean` | **仅选择控制** | 见 3.1 |
| `lockedKey` 指定字段 | `Boolean` | 已选面板 | 仅影响浮层中是否显示“移除”按钮 |

行内按钮的显示/禁用/权限**不属于**表格数据协议，完全由调用方在 `column.slot` 中按自身业务规则实现。

### 3.1 `_disabled` 固定规则（重点）

- **只有布尔值 `true`** 使该行不能通过**选择列复选框**勾选（含表头全选、点击行勾选）。
- `_disabled === false`、字段未设置、或任何非 `true` 值 → 按正常规则可选。
- **仅影响选择列勾选**，不影响：整行样式、行点击/双击、行内按钮、编辑/删除等业务操作、`row-click` 等事件。
- **程序化路径不受限**：`defaultSelection` 回显与 `setSelection()` 可以选中 `_disabled` 行（复选框呈“已勾选且禁用”态）。这是 Element UI `toggleRowSelection` 的原生行为，用于支持“已选但当前不可再操作”的锁定场景。
- 动态修改 `_disabled` 后选择列自动刷新；**已被选中的行后来被设为 `_disabled = true` 时，已有选中状态保留**（与程序化选中一致），如需剔除请显式 `setSelection`/`clearSelection`。
- 数据刷新/翻页时由 Element 原生 `reserve-selection`（按 `rowKey`）决定保留或失效，组件不额外清空、也不会保留 `rowKey` 已不存在的选中歧义之外的状态。

```js
const tableData = [
  { id: 1, name: '正常数据', _disabled: false },      // 可选
  { id: 2, name: '禁止勾选但仍允许操作', _disabled: true }, // 复选框禁用，其余功能正常
  { id: 3, name: '未设置禁用字段' },                   // 可选
]
```

## 4. 选择功能示例

```vue
<ConfigTable
  ref="table"
  :data="rows"
  :columns="[{ type: 'selection' }, { prop: 'name', label: '名称' },
             { label: '操作', slot: 'op' }]"
  row-key="id"
  reserve-selection
  locked-key="locked"
  :selection-display-props="['code', 'name']"
  :default-selection="echoRows"
  @search="load"
>
  <template #op="{ row }">
    <!-- 按钮权限与 _disabled 完全独立 -->
    <el-button type="text" @click="edit(row)">编辑</el-button>
    <el-button type="text" :disabled="!row.canDelete" @click="del(row)">删除</el-button>
  </template>
</ConfigTable>

<script>
export default {
  methods: {
    batch() {
      const rows = this.$refs.table.getSelectedRows() // 含跨页保留、可含 _disabled 回显行
    },
    echo() {
      this.$refs.table.setSelection(this.savedRows)   // 程序化回显（可含 _disabled 行）
    },
    reset() {
      this.$refs.table.clearSelection()
    },
  },
}
</script>
```

完整可运行示例见 `src/demo/ConfigTableDemo.vue`（覆盖：`_disabled` 三种取值、全选跳过禁用行、
行内按钮/行点击不受影响、程序化选中禁用行、跨页保留 + 已选面板移除/锁定、动态修改 `_disabled`、
查询清空选中、全部 13 类搜索控件、多级表头、排序、分页电梯/每页条数、附加复选框过滤、
自定义区间互斥、text/slot 字段）。

## 5. 其他功能说明

- **多级表头**：列配置 `children` 数组递归渲染。
- **排序**：`sortable: true` 为服务端排序（`'custom'`），组件不排序，监听 `sort-change` 后重新 `search`。
- **筛选**：`filters/filterMultiple` 透传 Element 原生表头筛选。
- **加载/空态**：`loading` 控制遮罩；空数据默认 Element 样式，可用 `empty` 插槽替换。
- **序号列**：`type: 'index'` 自动按分页连续编号（`(pageNum-1)*pageSize + i + 1`）。
- **异常与边界**：`data/columns/searchFields` 缺省安全；行缺 `rowKey` 字段时按对象引用比较；`total` 缺省按 0。
- **样式定制**：组件样式全部 scoped，未修改任何全局 Element 样式。

**不支持（旧组件亦无或本次未迁移）**：行内单元格编辑、前端排序、树形表格行、虚拟滚动。

## 6. 迁移说明（旧 → 新）

### 6.1 文件与组件映射

| 旧文件（oldConfigtable/） | 旧组件名 | 去向 |
|---|---|---|
| `kconfigtable.vue` | `KConfigTable` | → `ConfigTable/index.vue`（`ConfigTable`） |
| `HDatagrid.vue` | `HDatagrid` | 合并进 `ConfigTable`（表格+分页+已选抽屉） |
| `CurrentComponent.vue` | `CurrentComponent` | 合并进 `ConfigTable` 模板（按 `type` 分支渲染），动态组件层删除 |
| `AutoSelect.vue` | `AutoSelect` | → `type: 'select' / 'select-input'` + `checkAll` + `customRange` |
| `DatePicker.vue` | `DatePicker` | → `type: 'date' / 'daterange'` + `disableFuture` + `maxSpanDays` |
| `HDoubleInput.vue` | `HDoubleInput` | → `type: 'double-input'` |
| `HUnitInput.vue` | `HUnitInput` | → `type: 'unit-input'` |
| `KSelectTree.vue` | `KSelectTree` | → `type: 'tree'`（el-select + el-tree 实现） |
| `KSelectTreeBranch.vue` | `KSelectTreeBranch` | **移除**：强依赖业务接口 `$api.sysBranchSet*`、`localStorage.currentUser`、`window.LOCAL_CONFIG`，本项目不存在该环境；如需组织树选择，用 `type: 'tree'` + 调用方注入 `treeData` 或 `field.slot` 自定义实现 |

> 未保留旧目录兼容入口：`oldConfigtable` 在本项目内无任何调用方且依赖不存在的全局环境
> （`h-*`/`u-*` 组件、`$bi`/`$api`/`$lodash`、`@` 别名资源），兼容层无实际可验证对象。
> 旧目录暂保留原位未删除（删除需另行确认）。

### 6.2 Props 映射

| 旧 prop | 新 prop | 差异说明 |
|---|---|---|
| `conditions` | `searchFields` | 结构重命名：`element_code→prop`、`element_name→label`、`component+type→type`、`visable→hidden`（语义取反）、`before/after/third→startProp/endProp/extraProp`、`data_dict/selectList→options`（固定 `{label,value,disabled}`，alias 机制移除）、`isShowCustomize+customize→customRange`、`isShowInput→type:'select-input'`、`options.pickerMaxDays→maxSpanDays` |
| `searchCols` | `searchColumns` | 同 |
| `showMore` | `showMoreButton` | 同 |
| `hiddenSearch` / `hiddenReset` | `showSearchButton` / `showResetButton` | 语义取反 |
| `loading` | `searchButtonLoading` | 原“查询按钮加载态开关” |
| `autoLoad` | `autoSearch` | 同 |
| `conditionsFlag` + `conditionsOnlyFirstFlag` | `searchOnFieldsChange` | `'never'/'first'/'always'` 三态合并 |
| `queryClearSelect` | `clearSelectionOnQuery` | 同（仅查询按钮清空） |
| `tData` | `data` | 新组件不再向行写入 `_checked/_disabled` |
| `hTableLoading` | `loading` | 同 |
| `hasPage` | `showPagination` | 同 |
| `pageSizeOpts` | `pageSizes` | 同 |
| `showTotal/showElevator/showSizer` | `pagerLayout` | 用 Element layout 字符串统一控制 |
| `rowSelect` | `rowClickSelect` | 明确为“点击行切换勾选”，遵守 `_disabled` |
| `highlightRow` | `highlightCurrentRow` | 采用 Element 原生语义（点击行高亮） |
| `singleSelectProduct` | `singleSelection` | 同 |
| `primarySelect` | `defaultSelection` | 同（程序化回显，可含 `_disabled` 行） |
| `reserveSelection` / `rowKey` | 同名 | 改为 Element 原生 `reserve-selection` 实现 |
| `showDrawer` | `showSelectionPanel` | h-drawer → el-popover |
| `showDrawerClearAll` | `selectionPanelClearAll` | 同 |
| `showItem` | `selectionDisplayProps` | 同 |
| `disabledKey` | `lockedKey` | **职责收窄**：仅控制已选面板“移除”按钮显隐；旧版“向历史选中行写 `_disabled`”的行为按新规则移除（`_disabled` 只由业务数据自身决定） |
| `autoHeight` | `height: 'auto'` | 同义 |
| （无对应） | `fitHeight` | 旧版默认 DOM 测量存在多实例互踩与 resize 泄漏缺陷，改为显式开启 |
| `tableRef` / `searchFormRef` | — | 移除：ref 由调用方命名，内部实例经 `getTable()` 获取 |
| `dataCheckedProp` / `showTitle` / `multiLevel` / `rowSelectOnly` / `showCheckBox` | — | 移除：前两者为外部 h-table 魔改行为源码不可考；`multiLevel` 由 `children` 取代；`rowSelectOnly` 行为不可考；`showCheckBox` 在旧代码中声明后从未使用 |

### 6.3 事件映射

| 旧事件 | 新事件 | 说明 |
|---|---|---|
| `searchTableData` | `search` | 新载荷为合并副本，不再把 `pageNum/pageSize` 写死进内部表单对象 |
| `conditions-reset` | `reset` | 同 |
| `search-change` | `search-change` | 参数由 `(arguments, item)` 规范为 `(value, field, form)` |
| `searchFormData` | `search-form-change` | 同 |
| `on-select-change` | `selection-change` | Element 原生 |
| `on-select` | `select` | Element 原生（选中与取消均触发） |
| `on-select-all` | `on-select-all`→`select-all` | Element 原生 |
| `on-select-cancel` | — | Element 无此事件，取消勾选信息并入 `select`；旧版该事件与 `on-select-change` 数据重复 |
| `on-row-click` | `row-click` | 同 |
| `on-sort-change` | `sort-change` | 参数规范为 `({ column, prop, order })` |
| `sendselected` | — | 与 `on-select-change` 重复（deep watch），由 `selection-change` 覆盖 |
| `changeCurrent` / `changePageSize` | — | 分页变化统一并入 `search` 载荷 |
| `on-check-box-chane`（拼写错误） | `filter-checkbox-change` | 修正拼写 |
| （HDatagrid 内部）`on-row-dblclick` / `on-current-change` | `row-dblclick` / `current-change` | 保留，Element 命名 |

### 6.4 方法映射

| 旧方法 | 新方法 | 说明 |
|---|---|---|
| `getTableRef()` | `getTable()` | 返回 `el-table` 实例 |
| `datagrid.clearAll(type)` | `clearSelection()` | 语义化拆分 |
| （直接改 `$refs.datagrid.selected`） | `setSelection(rows)` | 公开程序化选中入口 |
| （读 `$refs.datagrid.selected`） | `getSelectedRows()` | — |
| `formSearch()`（kconfigtable） | `search()` | — |
| `formSearchReset()` | `resetSearch()` | — |
| `handleResize()` | — | 由 `fitHeight` 内部处理 |

### 6.5 已知限制与注意事项

1. 搜索区“全选/反选”作用于**全部未禁用选项**；旧 `isSelectFilter`（按过滤结果全选）为 h-select 内部行为，无法核实，未迁移。
2. 树形下拉不支持搜索过滤（旧 `u-select` 能力，Element 组合实现下未提供）。
3. 字典接口自动加载（旧 `$api.comControllerParams`）移除，选项数据一律由调用方以 `options/treeData` 注入。
4. 旧版重置依赖组件销毁重建（`isRefash`）与 `$forceUpdate`，新版为纯状态重置；行为一致但不再触发自控件的重新挂载。
5. 旧版空数据图片（`@/assets/404@2x.png`，资源在本项目不存在）未迁移，使用 Element 默认空态或 `empty` 插槽。
6. `rowKey` 重复值、行对象引用替换等场景遵循 Element 原生 `reserve-selection` 语义（按 key 匹配保留）。

## 7. 修复的旧版缺陷（有源码依据）

| 缺陷 | 位置 | 处理 |
|---|---|---|
| 向父组件数据写入 `_checked`/`_disabled` | HDatagrid `tData` watch | 组件不再修改任何行数据 |
| computed 中修改 props（`item.maxlength`） | kconfigtable `displayCondition` | 移除副作用 |
| `debugger` 语句残留 | DatePicker `created` | 移除 |
| window resize 监听从不移除 | HDatagrid `mounted` | `beforeDestroy` 移除，且仅 `fitHeight` 开启时注册 |
| columns watch 笔误 `val.type`（应为 `val[i].type`） | HDatagrid | 逻辑重写后不存在 |
| 同一段选中对账逻辑在 4 个事件重复 4 份 | HDatagrid | 由 Element 原生选择状态取代 |
| 查询把 `pageNum/pageSize` 写死进 `searchForm` 并随重置残留 | kconfigtable `validSeachForm` | `search` 载荷改为合并副本 |
| 大量 `console.log` 调试输出 | 多个文件 | 移除 |

## 8. 测试与验证

### 8.1 验证环境与方式

| 项 | 说明 |
|---|---|
| 运行环境 | Vue 2.7.16 + element-ui 2.15.14 + Vite 5（`npm run dev`，端口 3100） |
| 验证方式 | **真实浏览器运行验证**：Playwright 驱动 headless Chromium 打开 `src/demo/ConfigTableDemo.vue` 演示页，逐项操作 UI 并断言 DOM 状态与事件日志。项目无测试框架，未为此新增依赖，验证脚本置于仓库外（`/tmp/pwtest/verify-full.js`，本机可重放） |
| 虚拟数据 | 25 条：`_disabled` 分别为 `true`（id 2/7）、`false`（id 3）、未设置（其余）；`locked`（id 4/9，验证面板锁定）；`canDelete`（id 5/10/15… 为 `false`，验证按钮权限独立） |
| 状态隔离 | 每组功能前重新加载页面，避免相互污染 |
| 构建验证 | `npm run build` 通过（含全部修改） |

### 8.2 验证结果：54/54 通过

| 组 | 项数 | 覆盖内容 | 结果 |
|---|---|---|---|
| A 结构渲染 | 7 | 收起态 5 条件+按钮区、更多展开 13 条件、多级表头分组、序号列、分页总数、工具栏、单元格插槽标签 | ✅ |
| B 搜索控件 | 22 | input 过滤、loading 遮罩、空态、重置恢复默认值、`reset`/回车事件、多选全选/反选、树单选回填、树多选勾选父+子节点、日期未来禁用、日期写入、范围拆分写入 `startProp/endProp`、数字清洗（`12abc.345x→12.34`）、上限钳制（`99999→10000`）、附带下拉默认首项、unit-input 整数清洗、select-input 组合、自定义区间互斥禁用/恢复、text 展示、slot 字段 | ✅ |
| C 附加复选框 | 1 | “仅看可用”勾选后查询过滤全部禁选行 | ✅ |
| D 分页 | 4 | 翻页 `search(pageNum=2)`、第二页序号从 11 连续、改每页 20 条并回页首、电梯跳末页 | ✅ |
| E 行选择 | 18 | 见 8.3 | ✅ |
| F 排序 | 1 | `sort-change`（custom）交给调用方，升/降序数据变化 | ✅ |
| G 稳定性 | 1 | 全程无 JS 运行时错误 | ✅ |

### 8.3 行选择与 `_disabled` 规则专项（E 组 18 项）

| 断言 | 预期（对应 §3.1 规则） |
|---|---|
| `_disabled === true` 行复选框置灰不可勾选（点击无效） | 仅选择列受控 |
| `_disabled === false` / 未设置行正常勾选 | 严格布尔 `true` 判定 |
| 表头全选跳过禁选行（10 行中选中 8） | Element `toggleAllSelection` 遵守 `selectable` |
| `setSelection()` 可程序化选中禁选行（呈“已勾选且禁用”态） | 程序化路径不受限（§3.1） |
| 禁选行 row-click 正常触发且不产生勾选 | `_disabled` 不拦截行事件 |
| 禁选行“编辑”按钮可点击；“删除”仅因 `canDelete=false` 禁用 | 按钮权限与选择控制相互独立 |
| 跨页保留：翻页后选中不丢、已选面板计数正确、翻回仍勾选 | `row-key + reserve-selection` |
| 面板中 `lockedKey` 行为真值时无移除按钮；普通行可移除且触发 `selection-change` | `lockedKey` 仅控制面板移除 |
| 查询按钮清空选中；翻页/回车不清空 | `clearSelectionOnQuery` 仅作用于查询按钮 |
| 动态改 `_disabled`：解禁后可勾选；已选行再禁选时勾选保留、复选框转禁用 | 选择列实时响应，不反向清除已有选中 |
| `getSelectedRows()` 返回含禁选回显行的完整选中集合 | 程序化选中计入 |

### 8.4 验证期间发现并修复的问题（本次重构引入，非旧版遗留）

| 问题 | 现象 | 修复 |
|---|---|---|
| 树多选丢失父节点 | `onTreeCheck` 误用 `getCheckedKeys(true)`（仅叶子），父子不联动下勾选“总部”返回空数组 | 改为 `getCheckedKeys()` 取全部勾选节点 |
| 翻页误清空选中 | 清空逻辑挂在 `search()` 内部，翻页/回车也触发，破坏跨页保留 | 清空移至查询按钮处理器 `handleSearchClick`，与旧组件 `searchClick` 语义一致 |

### 8.5 未覆盖项（如实说明）

- `fitHeight` 视口测量、`searchOnFieldsChange='first'/'always'`、`singleSelection` 与表头全选的交互组合：已实现并通过编译与代码走查，未纳入浏览器断言。
- 旧 `h-table` 专有行为（`dataCheckedProp`、`showTitle` 等）因外部库源码不在项目内，无法验证，处理方式见 §6.2。

### 8.6 手工回归清单

1. `npm run dev` 打开首页 ConfigTable 区块。
2. 按 §8.2 各组逐项操作：查询/重置/回车 → 各类控件 → 更多/收起 → 勾选与全选（观察 id 2/7 置灰）→ 工具栏“程序化选中禁用行/获取选中/清空选中/切换第2行禁选” → 翻页观察已选面板与 locked 行 → 点击“编码”表头排序。
3. 页面底部 `.log` 区域实时显示 `search / reset / search-change / selection-change / select / row-click / sort-change / filter-checkbox-change` 事件载荷，可作为断言依据。

