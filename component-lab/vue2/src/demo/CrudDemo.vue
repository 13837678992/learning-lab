<template>
  <div class="crud-demo">
    <h2>Crud 单文件组件 Demo</h2>
    <p class="demo-tip">
      数据保存在内存 mock 中，刷新页面后重置。支持：查询（姓名模糊/状态下拉/日期区间跨度限制）、分页、前端排序、新增、编辑、详情、
      删除、批量删除、下载、上传、自定义渲染列、长文本展开列；以及产品/城市下拉的异步加载缓存、查询条件联动、函数式条件必填。
    </p>
    <p class="demo-tip dict-call-info">{{ dictCallText }}</p>
    <Crud ref="crud" :crud-config="crudConfig" :request="mockRequest" @expand-change="onExpandChange" />
  </div>
</template>

<script>
import Crud from "../components/Crud/index.vue"

const statusList = [
  { key: "1", val: "启用" },
  { key: "0", val: "禁用" }
]

// 字典数据(模拟后端异步接口)
const productCategories = [
  { key: "elec", val: "电子产品" },
  { key: "cloth", val: "服装" },
  { key: "food", val: "食品" }
]
const productsByCategory = {
  elec: [
    { key: "p1", val: "手机" },
    { key: "p2", val: "笔记本电脑" },
    { key: "p3", val: "耳机" }
  ],
  cloth: [
    { key: "p4", val: "T恤" },
    { key: "p5", val: "牛仔裤" }
  ],
  food: [
    { key: "p6", val: "面包" },
    { key: "p7", val: "牛奶" },
    { key: "p8", val: "咖啡" }
  ]
}
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

let idSeed = 100
let users = [
  { id: 1, name: "张伟", age: 28, status: "1", email: "zhangwei@example.com", createDate: "20260701", region: "east", city: "sh", product: "p1", remark: "负责前端基础架构建设，主导组件库设计与落地，推动团队工程化规范，持续优化构建与发布流程。", remarkBtn: true },
  { id: 2, name: "李娜", age: 25, status: "1", email: "lina@example.com", createDate: "20260703", region: "east", city: "hz", product: "p2", remark: "产品运营负责人，专注用户增长与活动策划。", remarkBtn: true },
  { id: 3, name: "王强", age: 32, status: "0", email: "wangqiang@example.com", createDate: "20260710", region: "south", city: "gz", product: "p4", remark: "后端开发工程师。", remarkBtn: true },
  { id: 4, name: "刘洋", age: 24, status: "1", email: "liuyang@example.com", createDate: "20260715", region: "south", city: "sz", product: "p4", remark: "测试工程师，负责质量保障与自动化测试平台建设。", remarkBtn: true },
  { id: 5, name: "陈静", age: 30, status: "1", email: "chenjing@example.com", createDate: "20260722", region: "north", city: "bj", product: "p6", remark: "UI 设计师。", remarkBtn: true },
  { id: 6, name: "杨帆", age: 27, status: "0", email: "yangfan@example.com", createDate: "20260801", region: "north", city: "tj", product: "p7", remark: "数据分析师，负责指标体系建设。", remarkBtn: true },
  { id: 7, name: "赵敏", age: 26, status: "1", email: "zhaomin@example.com", createDate: "20260805", region: "east", city: "nj", product: "p3", remark: "HRBP。", remarkBtn: true },
  { id: 8, name: "孙磊", age: 35, status: "1", email: "sunlei@example.com", createDate: "20260812", region: "east", city: "sh", product: "p2", remark: "架构师，负责微服务治理与稳定性专项，牵头容量规划与全链路压测体系。", remarkBtn: true },
  { id: 9, name: "周芳", age: 29, status: "0", email: "zhoufang@example.com", createDate: "20260818", region: "south", city: "gz", product: "p6", remark: "财务专员。", remarkBtn: true },
  { id: 10, name: "吴昊", age: 31, status: "1", email: "wuhao@example.com", createDate: "20260825", region: "north", city: "bj", product: "p8", remark: "项目经理。", remarkBtn: true },
  { id: 11, name: "郑爽", age: 23, status: "1", email: "zhengshuang@example.com", createDate: "20260828", region: "east", city: "hz", product: "p5", remark: "前端实习生。", remarkBtn: true },
  { id: 12, name: "冯涛", age: 33, status: "0", email: "fengtao@example.com", createDate: "20260901", region: "south", city: "sz", product: "p7", remark: "运维工程师，负责 CI/CD 与监控告警体系。", remarkBtn: true }
]

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function today() {
  const d = new Date()
  const pad = n => (n > 9 ? n : "0" + n)
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
}

// mock 请求实现：签名与 axios 风格一致 (config) => Promise<{ data }>
function mockRequest(config) {
  const { url = "", method = "get", params = {}, data } = config
  const m = String(method).toLowerCase()
  const respond = (payload, ms = 400) =>
    new Promise(resolve => setTimeout(() => resolve({ data: payload }), ms))

  // 字典类异步查询(演示 focusMethod 异步加载与 cache 缓存)
  if (url.includes("/dict/productCategory") && m === "get") {
    return respond({ errorCode: "000000", errorMsg: "成功", data: clone(productCategories) }, 500)
  }
  if (url.includes("/dict/products") && m === "get") {
    return respond({ errorCode: "000000", errorMsg: "成功", data: clone(productsByCategory[params.category] || []) }, 600)
  }
  if (url.includes("/dict/regions") && m === "get") {
    return respond({ errorCode: "000000", errorMsg: "成功", data: clone(regions) }, 500)
  }
  if (url.includes("/dict/cities") && m === "get") {
    return respond({ errorCode: "000000", errorMsg: "成功", data: clone(citiesByRegion[params.region] || []) }, 600)
  }

  // 列表查询(含分页与筛选)
  if (url.includes("/user/list") && m === "get") {
    let list = users.map(u => ({ ...u }))
    if (params.name) {
      list = list.filter(u => u.name.indexOf(params.name) !== -1)
    }
    if (params.status !== undefined && params.status !== null && params.status !== "") {
      list = list.filter(u => String(u.status) === String(params.status))
    }
    if (params.productCategory !== undefined && params.productCategory !== null && params.productCategory !== "") {
      list = list.filter(u => (productsByCategory[params.productCategory] || []).some(p => p.key === u.product))
    }
    if (params.product !== undefined && params.product !== null && params.product !== "") {
      list = list.filter(u => u.product === params.product)
    }
    if (params.region !== undefined && params.region !== null && params.region !== "") {
      list = list.filter(u => u.region === params.region)
    }
    if (params.city !== undefined && params.city !== null && params.city !== "") {
      list = list.filter(u => u.city === params.city)
    }
    if (params.startDate) {
      list = list.filter(u => u.createDate >= params.startDate)
    }
    if (params.endDate) {
      list = list.filter(u => u.createDate <= params.endDate)
    }
    const pageNum = Number(params.pageNum) || 1
    const pageSize = Number(params.pageSize) || 10
    const total = list.length
    const start = (pageNum - 1) * pageSize
    return respond({ errorCode: "000000", errorMsg: "成功", data: list.slice(start, start + pageSize), total })
  }

  // 新增
  if (url.includes("/user/add") && m === "post") {
    const row = { ...clone(data), id: idSeed++, createDate: today(), remarkBtn: true }
    users.unshift(row)
    return respond({ errorCode: "000000", errorMsg: "新增成功" })
  }

  // 修改
  if (url.includes("/user/mod") && m === "post") {
    const idx = users.findIndex(u => String(u.id) === String(data.id))
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...clone(data) }
    }
    return respond({ errorCode: "000000", errorMsg: "修改成功" })
  }

  // 删除(单行,参数在 query 中)
  if (url.includes("/user/del") && m === "delete") {
    users = users.filter(u => String(u.id) !== String(params.id))
    return respond({ errorCode: "000000", errorMsg: "删除成功" })
  }

  // 批量删除(逐行调用,参数在请求体中)
  if (url.includes("/user/mulDel") && m === "post") {
    users = users.filter(u => String(u.id) !== String(data.id))
    return respond({ errorCode: "000000", errorMsg: "删除成功" })
  }

  // 下载导出
  if (url.includes("/user/export") && m === "get") {
    return respond(new Blob(["id,name,status\n"], { type: "text/csv" }), 600)
  }

  // 上传导入
  if (url.includes("/user/import") && m === "post") {
    return respond({ errorCode: "000000", errorMsg: "导入成功(mock)" })
  }

  return Promise.reject(new Error("未匹配的 mock 请求: " + url))
}

const userFormList = [
  { prop: "name", label: "姓名", type: "input", required: true, maxlength: 20, showWordLimit: true },
  { prop: "age", label: "年龄", type: "inputNumber", min: 0, max: 150, precision: 0 },
  { prop: "status", label: "状态", type: "select", required: true, selectList: statusList },
  {
    prop: "email",
    label: "邮箱",
    type: "input",
    rules: [{ type: "email", message: "邮箱格式不正确", trigger: ["blur", "change"] }]
  },
  {
    prop: "remark",
    label: "备注",
    type: "textarea",
    maxlength: 100,
    showWordLimit: true,
    // 函数式条件必填:状态为"禁用"时备注必填
    required: (item, form) => form.status === "0"
  }
]

export default {
  name: "CrudDemo",
  components: { Crud },
  data() {
    return {
      dictCallCount: {
        "/dict/productCategory": 0,
        "/dict/products": 0,
        "/dict/regions": 0,
        "/dict/cities": 0
      },
      crudConfig: {
        formConfig: {
          queryFormConfig: {
            buttonShowList: ["query", "reset", "add", "download", "upload", "mulDelete"],
            formList: [
              { prop: "name", label: "姓名", type: "input" },
              { prop: "status", label: "状态", type: "select", selectList: statusList },
              // 产品类型:首次聚焦异步加载,加载后不再重复请求
              {
                prop: "productCategory",
                label: "产品类型",
                type: "select",
                focusMethod: () => this.fetchDict("/dict/productCategory"),
                // 联动:类型变更清空已选产品
                changeMethod: (value, form) => {
                  form.product = ""
                }
              },
              // 产品:依赖产品类型,按类型缓存(cache 声明依赖字段)
              {
                prop: "product",
                label: "产品",
                type: "select",
                cache: ["productCategory"],
                focusMethod: (value, form) => this.fetchDict("/dict/products", { category: form.productCategory }),
                // 函数式条件必填:选了产品类型就必须选产品
                required: (item, form) => !!form.productCategory
              },
              // 地区:首次聚焦异步加载
              {
                prop: "region",
                label: "地区",
                type: "select",
                focusMethod: () => this.fetchDict("/dict/regions"),
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
                focusMethod: (value, form) => this.fetchDict("/dict/cities", { region: form.region }),
                showMethod: (value, form) => !!form.region,
                required: (item, form) => !!form.region
              },
              // 日期区间:跨度限制为 30 天(disabledDateNum + dateUnit)
              {
                prop: "startDate",
                label: "开始日期",
                type: "date",
                isStartDate: true,
                endDateProp: "endDate",
                disabledDateNum: 30,
                dateUnit: "day"
              },
              {
                prop: "endDate",
                label: "结束日期",
                type: "date",
                isStartDate: false,
                startDateProp: "startDate",
                disabledDateNum: 30,
                dateUnit: "day"
              }
            ]
          },
          addFormConfig: {
            labelWidth: 90,
            formList: userFormList,
            defaultForm: { status: "1", age: 20 }
          },
          modFormConfig: {
            labelWidth: 90,
            formList: [{ prop: "id", label: "ID", type: "input", showMethod: false, disabled: true }, ...userFormList]
          },
          detailFormConfig: {
            labelWidth: 90,
            formList: [{ prop: "id", label: "ID", type: "input", disabled: true }, ...userFormList]
          }
        },
        tableConfig: {
          rowKey: "id",
          needTableMul: true,
          needTableButton: true,
          tableColumns: [
            { prop: "id", label: "ID", minWidth: 70 },
            { prop: "name", label: "姓名", sortable: true },
            { prop: "age", label: "年龄", sortable: true, minWidth: 80 },
            { prop: "status", label: "状态", needGetVal: true, selectList: statusList, minWidth: 90 },
            {
              prop: "region",
              label: "地区",
              needGetVal: true,
              selectList: regions,
              minWidth: 80
            },
            {
              prop: "city",
              label: "城市",
              needGetVal: true,
              selectList: regions.reduce((acc, r) => acc.concat(citiesByRegion[r.key]), []),
              minWidth: 80
            },
            {
              prop: "product",
              label: "产品",
              needGetVal: true,
              selectList: productCategories.reduce((acc, c) => acc.concat(productsByCategory[c.key]), []),
              minWidth: 110
            },
            { prop: "email", label: "邮箱", minWidth: 170 },
            { prop: "createDate", label: "创建日期", needAddDate: true, minWidth: 110 },
            {
              prop: "statusTag",
              label: "状态徽标",
              minWidth: 90,
              render: (h, { row }) =>
                h(
                  "el-tag",
                  { props: { type: row.status === "1" ? "success" : "info", size: "small" } },
                  row.status === "1" ? "启用" : "禁用"
                )
            },
            { prop: "remark", label: "备注", expand: true, minWidth: 180 }
          ],
          tableButtonList: ["detail", "mod", "del"]
        },
        urlConfig: {
          queryUrlConfig: { url: "/user/list", type: "get" },
          addUrlConfig: { url: "/user/add", type: "post" },
          modUrlConfig: { url: "/user/mod", type: "post" },
          delUrlConfig: { url: "/user/del", type: "delete", data: "id" },
          mulDelUrlConfig: { url: "/user/mulDel", type: "post", data: "id" },
          downloadUrlConfig: { url: "/user/export", type: "get" },
          uploadUrlConfig: { url: "/user/import", type: "post" }
        }
      }
    }
  },
  computed: {
    dictCallText() {
      const c = this.dictCallCount
      return (
        `字典接口调用次数——产品类型 ${c["/dict/productCategory"]} 次、产品 ${c["/dict/products"]} 次、` +
        `地区 ${c["/dict/regions"]} 次、城市 ${c["/dict/cities"]} 次。` +
        `产品按产品类型缓存、城市按地区缓存：重复展开同一条件下的下拉不会重复请求（切换条件后首次聚焦才请求）。`
      )
    }
  },
  methods: {
    mockRequest,
    // 字典异步查询:记录调用次数,便于观察缓存效果
    fetchDict(path, params) {
      this.dictCallCount[path] = (this.dictCallCount[path] || 0) + 1
      return mockRequest({ url: path, method: "get", params }).then(res => res.data.data)
    },
    onExpandChange(row) {
      console.log("表格展开事件:", row)
    }
  },
  mounted() {
    this.$refs.crud.submit()
  }
}
</script>

<style scoped>
.crud-demo h2 {
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
</style>
