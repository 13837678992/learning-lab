<template>
  <div class="form-demo">
    <h2>Form 数据收集组件 Demo</h2>
    <p class="demo-tip">
      配置驱动的数据收集表单：必填校验、函数式条件必填（选了地区后城市必填）、手机号数字过滤、地区/城市下拉异步加载并按地区缓存、
      联动清空、默认值；点击「提交」后校验通过的数据会收集并展示在下方。
    </p>
    <p class="demo-tip dict-call-info">{{ dictCallText }}</p>
    <div class="form-card">
      <Form ref="formRef" :form-config="formConfig" @submit="onSubmit" />
    </div>
    <div class="collected" v-if="collected">
      <h3>收集到的数据</h3>
      <pre>{{ collectedJson }}</pre>
    </div>
  </div>
</template>

<script>
import Form from "../components/Form/index.vue"

const regions = [
  { key: "east", val: "华东" },
  { key: "south", val: "华南" },
  { key: "north", val: "华北" }
]
const citiesByRegion = {
  east: [
    { key: "sh", val: "上海" },
    { key: "hz", val: "杭州" },
    { key: "nj", val: "南京" }
  ],
  south: [
    { key: "gz", val: "广州" },
    { key: "sz", val: "深圳" }
  ],
  north: [
    { key: "bj", val: "北京" },
    { key: "tj", val: "天津" }
  ]
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export default {
  name: "FormDemo",
  components: { Form },
  data() {
    return {
      collected: null,
      dictCallCount: {
        "/dict/regions": 0,
        "/dict/cities": 0
      },
      formConfig: {
        labelWidth: 100,
        // 垂直布局(默认),设置 inline: true 可切换为行内表单
        formList: [
          { prop: "name", label: "姓名", type: "input", required: true, maxlength: 20, showWordLimit: true },
          {
            prop: "gender",
            label: "性别",
            type: "radioGroup",
            required: true,
            radioGroupList: [
              { key: "1", val: "男" },
              { key: "0", val: "女" }
            ]
          },
          { prop: "age", label: "年龄", type: "inputNumber", min: 0, max: 150, precision: 0 },
          {
            prop: "phone",
            label: "手机号",
            type: "input",
            required: true,
            maxlength: 11,
            reg: /[^\d]/g,
            rules: [{ pattern: /^1\d{10}$/, message: "手机号格式不正确", trigger: "blur" }]
          },
          {
            prop: "email",
            label: "邮箱",
            type: "input",
            rules: [{ type: "email", message: "邮箱格式不正确", trigger: ["blur", "change"] }]
          },
          // 地区:首次聚焦异步加载
          {
            prop: "region",
            label: "地区",
            type: "select",
            focusMethod: () => this.mockDict("/dict/regions"),
            // 联动:地区变更清空已选城市
            changeMethod: (value, form) => {
              form.city = ""
            }
          },
          // 城市:依赖地区,按地区缓存;未选地区时隐藏;选了地区后必填
          {
            prop: "city",
            label: "城市",
            type: "select",
            cache: ["region"],
            focusMethod: (value, form) => this.mockDict("/dict/cities", { region: form.region }),
            showMethod: (value, form) => !!form.region,
            required: (item, form) => !!form.region
          },
          { prop: "entryDate", label: "入职日期", type: "date", required: true },
          { prop: "remark", label: "备注", type: "textarea", maxlength: 100, showWordLimit: true }
        ],
        // 收集数据时把 age 转为数字
        needNumPropList: ["age"],
        buttonShowList: ["submit", "reset"],
        defaultForm: { gender: "1", age: 25 }
      }
    }
  },
  computed: {
    collectedJson() {
      return JSON.stringify(this.collected, null, 2)
    },
    dictCallText() {
      const c = this.dictCallCount
      return `字典接口调用次数——地区 ${c["/dict/regions"]} 次、城市 ${c["/dict/cities"]} 次。城市下拉按地区缓存：同一地区重复展开不会重复请求。`
    }
  },
  methods: {
    // 模拟字典异步接口
    mockDict(path, params) {
      this.dictCallCount[path] = (this.dictCallCount[path] || 0) + 1
      return new Promise(resolve => {
        setTimeout(() => {
          let list = []
          if (path === "/dict/regions") {
            list = regions
          } else if (path === "/dict/cities") {
            list = citiesByRegion[params.region] || []
          }
          resolve(clone(list))
        }, 500)
      })
    },
    onSubmit(data) {
      this.collected = data
      this.$message.success("数据收集成功")
    }
  }
}
</script>

<style scoped>
.form-demo h2 {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.demo-tip {
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.85rem;
  line-height: 1.6;
}

.dict-call-info {
  color: #409eff;
}

.form-card {
  max-width: 640px;
  padding: 1.5rem 1.5rem 0.5rem;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}

.collected {
  margin-top: 1rem;
  max-width: 640px;
}

.collected h3 {
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}

.collected pre {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 1rem;
  font-size: 0.85rem;
  line-height: 1.6;
  overflow: auto;
}
</style>
