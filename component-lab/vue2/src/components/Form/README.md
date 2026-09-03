# Form 配置化数据收集表单组件（单文件版）

基于 **Element UI** 的配置化数据收集表单组件，从 [Crud 组件](../Crud/README.md) 的表单能力抽取而来的独立单文件版本。通过一份 `formConfig` 配置生成完整表单：17 种控件类型、动态校验、异步下拉加载与缓存、条件联动、函数式条件必填、默认值与数据收集提交。

## 特性

- 纯配置驱动：字段、校验、按钮、默认值全部由 `formConfig` 描述，`formList` 字段语义与 Crud 组件完全一致
- 17 种控件类型（input / textarea / password / inputNumber / select / selectTree / cascader / date / year / month / time / dateTime / radioGroup / checkBox）
- 动态校验：`required`（布尔或函数）、`rules`（含自定义 `validator`）、提交前整体校验并滚动到首个错误项
- 下拉异步加载与缓存：`focusMethod` 异步加载选项，`cache` 按依赖字段值缓存
- 条件联动：`showMethod` 控制显隐、`changeMethod` 联动清空、日期区间跨度限制（`disabledDateNum` / `dateUnit`）
- 数据收集出口：`submit` 事件 / `formConfig.submitMethod` / `$refs.getData()`，自动做数字转换（`needNumPropList`）与数组转字符串（`needString`）
- 垂直布局（默认）或行内布局（`inline: true`）
- 不依赖 Vuex / lodash：字典支持 `selectList` 内联或 Vuex `$store` 的 `dictList`

## 依赖

- element-ui（控件与校验）
- dayjs（日期区间联动禁用）
- sass（构建期，devDependency）

## 快速开始

```vue
<template>
  <Form ref="formRef" :form-config="formConfig" @submit="onSubmit" />
</template>

<script>
import Form from './components/Form/index.vue'

export default {
  components: { Form },
  data() {
    return {
      formConfig: {
        labelWidth: 100, // 垂直布局(默认);inline: true 可切换行内表单
        formList: [
          { prop: 'name', label: '姓名', type: 'input', required: true },
          { prop: 'gender', label: '性别', type: 'radioGroup', radioGroupList: [{ key: '1', val: '男' }, { key: '0', val: '女' }] },
          { prop: 'age', label: '年龄', type: 'inputNumber', min: 0, max: 150 },
        ],
        needNumPropList: ['age'], // 收集数据时 age 转为数字
        buttonShowList: ['submit', 'reset'],
        defaultForm: { gender: '1' },
      },
    }
  },
  methods: {
    onSubmit(data) {
      // data 为校验通过、已做数字/数组转换处理的数据
      console.log('收集到的数据:', data)
    },
  },
}
</script>
```

完整可运行示例见 `src/demo/FormDemo.vue`（员工入职登记表：必填校验、手机号数字过滤、地区/城市异步加载缓存联动、条件必填、提交后展示收集的 JSON）。

## Props

| Prop | 类型 | 必填 | 说明 |
|---|---|---|---|
| `formConfig` | Object | 是 | 表单全部配置，结构见下文 |
| `buttons` | Object | 否 | 按钮注册表（共享架构扩展点）：与内置按钮（submit/reset/default/defaultValidate）合并，同名覆盖。每个按钮 `{ name, type, plain, method }`，`method` 调用契约：`this` 为表单实例，参数 `(buttonItem, form, formList)` |
| `inline` | Boolean | 否 | 强制行内布局（Crud 复用本组件时传 `true` 保持其历史行内行为），默认 `false`（垂直布局，也可由 `formConfig.inline` 控制） |

## Events

| 事件 | 参数 | 说明 |
|---|---|---|
| `submit` | `data` | 点击「提交」且校验通过后触发，`data` 为收集到的数据（已做数字转换/数组转字符串处理）。优先级：按钮自定义 `method` > `formConfig.submitMethod` > `submit` 事件 |

## 通过 $refs 访问的方法

| 方法 | 说明 |
|---|---|
| `validate(callback)` | 手动触发整体校验，`callback(valid, fields)` |
| `reset()` | 重置为默认值（`defaultForm`）并清空校验状态 |
| `getData()` | 获取收集的数据（已做数字/数组处理，未校验） |
| `setData(data)` | 预填/回显数据（仅更新 `formList` 中声明的字段） |

## formConfig 结构

| 字段 | 类型 | 说明 |
|---|---|---|
| `labelWidth` | Number | 标签宽度，不传按内容自动计算（最小 80） |
| `labelPosition` | String | 标签位置，默认 `right` |
| `inline` | Boolean | 行内表单，默认 `false`（垂直布局） |
| `formList` | Array | 表单项配置，见下表 |
| `buttonShowList` | Array | 按钮区按钮，字符串（内置名）或对象 `{ name, buttonName, showMethod, method, disabled }` |
| `defaultForm` | Object | 默认值；`defaultForm` 中未在 `formList` 声明的字段不会进入表单模型 |
| `needNumPropList` | Array | 收集数据前转 Number 的字段名列表 |
| `needString` | — | 表单项字段（见下表）：数组值 join(",") |
| `submitMethod` | Function | 提交回调 `(data, form, formList)`，存在时优先于 `submit` 事件 |

**`formList` 表单项字段**（与 Crud 组件完全一致）

| 字段 | 说明 |
|---|---|
| `type` | 控件类型：`input` / `textarea` / `password` / `inputNumber` / `select` / `selectTree` / `cascader` / `date` / `year` / `month` / `time` / `dateTime` / `radioGroup` / `checkBox` |
| `prop` / `label` | 字段名 / 标签 |
| `required` | 必填，布尔或函数 `(item, form) => bool`（条件必填） |
| `rules` | 自定义校验规则数组（async-validator 规则，`validator` 会追加表单对象参数） |
| `placeholder` / `width` / `class` | 占位符 / 宽度 / class |
| `disabled` | 布尔或函数（控件置灰） |
| `reg` | 正则，input 时过滤非法字符（如 `/[^\d]/g` 只允许数字） |
| `multiple` / `maxlength` / `showWordLimit` | 控件通用属性 |
| `min` / `max` / `precision` / `controls` / `allowNegative` | inputNumber 属性 |
| `minRows` / `maxRows` | textarea 行数 |
| `selectList` / `tcKey` | 下拉选项：直接数组 `[{key, val}]`，或 Vuex `$store.state.common.dictList` 的 key |
| `showKey` | 下拉/树显示 `key: val` |
| `remote` / `remoteMethod` | 远程搜索 |
| `focusMethod` / `inputMethod` / `blurMethod` / `changeMethod` / `clearMethod` | 各事件回调，`(value, form, formList, ref)`；`focusMethod` 返回 `Promise<[{key, val}]>` 异步加载选项 |
| `cache` | 数组：focusMethod 结果按这些字段值缓存（联动下拉缓存） |
| `slotName` | 控件旁的具名插槽名（`slot-scope="{ row }"`，row 为 `{ item, form }`） |
| `showMethod` | 布尔或函数，控制表单项显隐 |
| `needString` | 收集数据前数组值 join(",")（select/checkBox） |
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
| `submit` | 提交：校验通过后依次走 按钮自定义 `method` > `submitMethod` > `submit` 事件；校验失败滚动到首个错误项 |
| `reset` | 重置为默认值 |
| `default` / `defaultValidate` | 默认按钮（`defaultValidate` 先校验再执行） |
| 任意对象 | `{ name, buttonName, method, showMethod, disabled }`，`method(form, formList)` |

## 组件架构（共享模块）

本组件是全项目的**共享表单核心**，[Crud 组件](../Crud/README.md) 复用本组件渲染查询表单与新增/修改/详情弹窗表单：

```
src/components/
├── Crud/           # 表格/分页/请求/弹窗 + 复用 Form
└── Form/           # 共享表单核心(17 种控件/校验/异步缓存/联动/条件必填)
```

- Crud 通过 `buttons` prop 注入其专属按钮（查询/新增/下载/上传/批量删除等），按钮回调内通过 `this.$parent` 调用 Crud 的方法
- Crud 通过 `inline` prop 强制行内布局，保持历史行为；Form 单独使用（数据收集场景）时默认垂直布局
- 表单渲染逻辑只维护一份：字段、控件、校验、缓存、联动的修复与增强自动对两个组件同时生效

## 与 Crud 组件的关系

- `formList` 配置语义、控件类型、校验、缓存、联动等与 Crud 完全一致，配置可互相迁移
- Crud 侧重表格/分页/请求/增删改查；本组件侧重纯数据收集：提交走 `submit` 事件 / `submitMethod`
- 布局默认垂直（`inline: true` 或 `inline` prop 可切换行内）
- 对外方法：`setData()` 预填、`validate()` / `reset()` / `getData()`

## Demo

`src/demo/FormDemo.vue`：员工入职登记表，演示必填校验、手机号数字过滤、地区/城市下拉异步加载并按地区缓存（页面显示字典调用次数）、联动清空与显隐、函数式条件必填（选地区后城市必填）、默认值，提交后展示收集到的 JSON 数据。

启动：`npm run dev` 后访问 http://localhost:3100 。
