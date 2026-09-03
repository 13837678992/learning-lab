<template>
  <div class="crud-container">
    <!-- 查询表单 -->
    <div class="form-container">
      <config-form
        :formConfig="formConfig.queryFormConfig"
        :buttons="crudFormButtons"
        :inline="true"
        ref="queryForm"
        key="queryForm"
      />
    </div>
    <div class="table-container">
      <el-table
        :data="tableData"
        border
        v-loading="tableLoading"
        ref="multipleTable"
        @selection-change="handleSelectionChange"
        :row-key="tableConfig.rowKey || ''"
        :style="tableConfig.needRowsDrap == true ? 'width: 100%;cursor:move' : 'width:100%'"
        :class="tableConfig.tableClass || ''"
        @expand-change="expandChange"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column
          align="center"
          type="expand"
          width="55"
          fixed="left"
          v-if="tableConfig.needTableExpand && tableData.length > 0"
        >
          <template slot-scope="scope">
            <slot :name="tableConfig.expandName" :row="scope.row"></slot>
          </template>
        </el-table-column>
        <el-table-column
          align="center"
          type="selection"
          width="55"
          :reserve-selection="!!tableConfig.rowKey && tableConfig.reserveSelection !== false"
          v-if="tableConfig.needTableMul && tableData.length > 0"
        ></el-table-column>
        <el-table-column
          align="center"
          type="index"
          width="55"
          label="序号"
          fixed="left"
          v-if="tableData.length > 0"
        ></el-table-column>
        <el-table-column
          v-for="(item) in tableConfig.tableColumns"
          :key="item.prop"
          :prop="item.prop"
          :label="item.label"
          align="center"
          :sortable="item.sortable ? item.sortable : false"
          :min-width="
            item.minWidth
              ? item.minWidth
              : flexColumnWidth(item.prop, tableData, item.label, item.needGetVal, item.tcKey || item.selectList)
          "
          :fixed="item.fixed ? item.fixed : false"
        >
          <template slot-scope="scope">
            <table-render v-if="item.render" :render="item.render" :scope="scope"></table-render>
            <div v-else-if="item.expand" class="expandable-content" :style="{ '-webkit-box-orient': 'vertical' }">
              <div
                :ref="item.prop + '_' + scope.row.id"
                :class="{
                  'content-collapse': !scope.row[`expand${item.prop}`],
                  'content-expanded': scope.row[`expand${item.prop}`]
                }"
              >
                {{ scope.row[item.prop] }}
              </div>
              <el-button
                v-if="scope.row[`${item.prop}Btn`]"
                type="text"
                size="mini"
                @click="toggleExpand(scope.row, item.prop)"
              >
                {{ scope.row[`expand${item.prop}`] ? "收起" : "展开" }}
              </el-button>
            </div>
            <span v-else :class="item.className ? item.className : ''">
              <span v-if="!!scope.row[`${item.prop}`] && scope.row[`${item.prop}`].toString().trim()">
                <span v-if="item.needGetVal">
                  {{ getVal(item.tcKey || item.selectList, scope.row[`${item.prop}`]) }}
                </span>
                <span v-else-if="item.needAddDate">
                  {{ addDate(scope.row[`${item.prop}`]) }}
                </span>
                <span v-else-if="item.needAddTime">
                  {{ addTime(scope.row[`${item.prop}`]) }}
                </span>
                <span v-else-if="item.needGetDate">
                  {{ getDate(scope.row[`${item.prop}`]) }}
                </span>
                <span v-else-if="item.needGetDateTime">
                  {{ getDateTime(scope.row[`${item.prop}`]) }}
                </span>
                <span v-else>{{ scope.row[`${item.prop}`] }}</span>
              </span>
              <span v-else>-</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          align="center"
          :label="tableConfig.tableConfigOpName || '操作'"
          :min-width="getTableButtonWidth()"
          v-if="tableData.length != 0 && tableConfig.needTableButton == true"
          fixed="right"
        >
          <template slot-scope="scope">
            <span v-for="(item, index) in tableConfig.tableButtonList" :key="index">
              <el-button
                size="mini"
                type="text"
                style="margin-right:5px"
                :disabled="item.disabled"
                v-if="!!item.showMethod ? item.showMethod(scope.row) : true"
                @click="handleTableButtonClick(item, scope.row, scope.$index)"
              >
                {{ getButtonText(item) }}
              </el-button>
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <!-- 分页 -->
    <div class="pagination-container" v-if="tableConfig.needPage != false">
      <el-pagination
        :current-page.sync="currentPage"
        :page-sizes="[10, 20, 50]"
        :page-size="pageSize"
        :total="total"
        background
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="currentPageChange"
        @size-change="pageSizeChange"
      />
    </div>
    <!-- 上传 -->
    <el-dialog
      center
      title="上传"
      :visible.sync="uploadDialogVisible"
      width="520"
      :show-close="true"
      :close-on-click-modal="false"
      v-if="uploadDialogVisible"
      append-to-body
      modal-append-to-body
      custom-class="commonFormDialog"
      top="2vh"
    >
      <div style="text-align: center">
        <el-upload class="upload-demo" action :show-file-list="false" accept=".xlsx, .xls" :http-request="uploadFile">
          <el-button size="small" type="primary">点击上传</el-button>
          <div slot="tip" class="el-upload__tip">只能上传xlsx/xls文件</div>
        </el-upload>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="uploadDialogVisible = false">取消</el-button>
      </div>
    </el-dialog>
    <!-- 公共表单 -->
    <el-dialog
      center
      :title="commonFormTitle"
      :visible.sync="commonFormDialog"
      width="75%"
      :show-close="true"
      :close-on-click-modal="false"
      v-if="commonFormDialog"
      append-to-body
      modal-append-to-body
      ref="commonFormDialog"
      custom-class="commonFormDialog"
      top="2vh"
    >
      <div>
        <config-form
          v-if="commonFormConfig.isHaveSlot"
          :formConfig="commonFormConfig"
          :buttons="crudFormButtons"
          ref="commonForm"
          key="commonForm"
        >
          <template
            :slot="x.slotName"
            slot-scope="scope"
            v-for="x in (commonFormConfig.formList || []).filter(z => z.slotName)"
          >
            <slot :name="x.slotName" :row="scope.row"></slot>
          </template>
        </config-form>
        <config-form
          v-else
          :formConfig="commonFormConfig"
          :buttons="crudFormButtons"
          ref="commonForm"
          key="commonForm"
        ></config-form>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="commonFormDialog = false">取消</el-button>
        <el-button @click="reset" v-if="commonFormConfig.needReset == false">重置</el-button>
        <el-button type="primary" @click="commonFormSumbit" v-if="commonFormConfig.needSubmit != false">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import ConfigForm from "../Form/index.vue"

// 默认请求超时时间(ms),可通过每个 urlConfig 的 timeout 覆盖
const REQUEST_TIMEOUT = 60000

// ---------- 内部工具函数 ----------
// 深拷贝:保留函数引用,处理 Date/RegExp 与循环引用
function cloneDeep(obj, seen) {
  if (obj === null || typeof obj !== "object") {
    return obj
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags)
  }
  seen = seen || new Map()
  if (seen.has(obj)) {
    return seen.get(obj)
  }
  const result = Array.isArray(obj) ? [] : {}
  seen.set(obj, result)
  Object.keys(obj).forEach(key => {
    result[key] = cloneDeep(obj[key], seen)
  })
  return result
}

// 对象/数组/FormData 转查询字符串
function buildQueryString(params) {
  if (!params) {
    return ""
  }
  if (typeof params === "string") {
    return params
  }
  const parts = []
  const append = (key, value) => {
    if (value === undefined || value === null) {
      return
    }
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value))
  }
  if (params instanceof FormData) {
    for (const pair of params.entries()) {
      append(pair[0], pair[1])
    }
  } else if (Array.isArray(params)) {
    params.forEach((value, index) => append(index, value))
  } else if (typeof params === "object") {
    Object.keys(params).forEach(key => {
      const value = params[key]
      if (Array.isArray(value)) {
        value.forEach(item => append(key, item))
      } else {
        append(key, value)
      }
    })
  }
  return parts.join("&")
}

// 内置 fetch 请求实现:axios 风格配置,返回 { data, status, headers }
async function defaultRequest(config) {
  const { url, method = "get", params, data, headers: reqHeaders = {}, responseType, timeout } = config
  const m = String(method).toLowerCase()
  let fullUrl = url || ""
  let queryParams = params
  // fetch 不支持 GET/HEAD 携带请求体,将 data 并入 query
  if ((m === "get" || m === "head") && data !== undefined && data !== null && !(data instanceof FormData)) {
    queryParams = { ...(params || {}), ...data }
  }
  const queryString = buildQueryString(queryParams)
  if (queryString) {
    fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString
  }
  const options = { method: m, headers: { ...reqHeaders } }
  if (!(m === "get" || m === "head") && data !== undefined && data !== null) {
    if (data instanceof FormData) {
      // 浏览器自动设置 multipart/form-data 边界
      options.body = data
      delete options.headers["Content-Type"]
    } else {
      options.body = JSON.stringify(data)
      if (!options.headers["Content-Type"]) {
        options.headers["Content-Type"] = "application/json"
      }
    }
  }
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  let timer = null
  if (controller && timeout) {
    options.signal = controller.signal
    timer = setTimeout(() => controller.abort(), timeout)
  }
  let res
  try {
    res = await fetch(fullUrl, options)
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
  let payload = null
  if (responseType === "blob") {
    payload = await res.blob()
  } else {
    const text = await res.text()
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch (e) {
        payload = text
      }
    }
  }
  if (!res.ok) {
    const message = payload && payload.message ? payload.message : `HTTP ${res.status}`
    throw new Error(message)
  }
  return { data: payload, status: res.status, headers: res.headers }
}

// 兼容 Vite(浏览器端无 process)与 Vue CLI(提供 process.env)两种宿主
function getEnv() {
  return typeof process !== "undefined" && process.env ? process.env : {}
}

// ---------- 表格自定义渲染列(原 render.vue) ----------
const TableRender = {
  functional: true,
  render: (h, data) => {
    const params = {
      row: data.props.scope.row,
      index: data.props.scope.$index
    }
    return h("span", [data.props.render(h, params)])
  }
}

export default {
  name: "Crud",
  components: {
    TableRender,
    ConfigForm
  },
  props: {
    crudConfig: {
      type: Object,
      required: true,
      default: () => {
        return {}
      }
    },
    //可选:自定义请求函数,签名 (config) => Promise<{data}>,config 为 axios 风格配置对象。
    //未传时使用内置 fetch 实现。
    request: {
      type: Function,
      default: null
    }
  },
  watch: {
    crudConfig: {
      handler() {
        this.formConfig = cloneDeep(this.crudConfig.formConfig)
        this.tableConfig = cloneDeep(this.crudConfig.tableConfig)
        this.urlConfig = cloneDeep(this.crudConfig.urlConfig)
      },
      immediate: true,
      deep: true
    },
    commonFormDialog: {
      handler(val) {
        if (val == false) {
          this.isMod = false
        }
      },
      immediate: true,
      deep: true
    }
  },
  data() {
    return {
      formConfig: {},
      tableConfig: {},
      urlConfig: {},
      cloneDeepModData: {}, //克隆表格修改数据
      detailFormConfig: {}, //保存详情表单设置
      buttonList: {
        del: {
          name: "删除",
          method: (data, row, index) => {
            if (data.method) {
              data.method(row)
            } else {
              this.isMod = false
              this.currentTableIndex = index
              this.del(row)
            }
          }
        },
        mod: {
          name: "修改",
          method: (data, row, index) => {
            if (data.method) {
              data.method(row)
            } else {
              this.isMod = true
              this.currentTableIndex = index
              this.showCommonFormDialog("mod", data.buttonName || "修改", row)
            }
          }
        },
        detail: {
          name: "详情",
          method: (data, row, index) => {
            if (data.method) {
              data.method(row)
            } else {
              this.isMod = false
              this.currentTableIndex = index
              this.showCommonFormDialog("detail", data.buttonName || "详情", row)
            }
          }
        },
        common: {
          name: "默认",
          method: (data, row, index) => {
            if (data.method) {
              data.method(row)
            } else {
              this.isMod = false
              this.currentTableIndex = index
              this.$message.warning("默认按钮必须自定义方法")
            }
          }
        }
      },

      allModData: "", //保存修改所有参数
      detailData: "", //保存详情所有参数
      detailDialog: false, //新增弹窗显示
      commonFormDialog: false, //公共表单是否显示
      commonFormConfig: {}, //公共表单配置
      commonFormTitle: "", //公共表单标题
      currentCommonFormName: "", //公共表单配置名字
      currentTableIndex: "",
      currentCommonFormUrlName: "", //公共表单对应地址名字
      currentCommonFormDefaultForm: {}, //当前操作公共表单默认数据
      isMod: false, //当前公共表单操作是否是修改
      uploadDialogVisible: false, //上传弹窗配置
      multipleSelection: [], //表格多选数据
      tableData: [], //表格数据
      tableLoading: false, //表格加载状态
      currentPage: 1, // 当前页
      total: 0, // 总数
      pageSize: 10 //每页数量
    }
  },
  computed: {
    //查询表单/公共表单的按钮注册表,注入共享表单组件(Form)使用
    crudFormButtons() {
      return {
        query: {
          name: "查询",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$refs.form.validate(valid => {
                if (valid) {
                  this.$parent.submit()
                } else {
                  this.scrollToFirstError()
                }
              })
            }
          }
        },
        reset: {
          name: "重置",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$refs.form.resetFields()
              this.getForm()
            }
          }
        },
        add: {
          name: "新增",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$parent.showCommonFormDialog("add", data.buttonName || "新增")
            }
          }
        },
        download: {
          name: "下载excel",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$parent.download()
            }
          }
        },
        download1: {
          name: "下载模板",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              if (data.mouldName) {
                const env = getEnv()
                window.location.href = ["local"].includes(env.ENV_CONFIG)
                  ? `/static/${data.mouldName}`
                  : `../${env.ASSETS_PUBLIC_PATH}/static/${data.mouldName}`
              } else {
                this.$message({
                  message: "请配置该模板名称！",
                  type: "error"
                })
              }
            }
          }
        },
        upload: {
          name: "上传",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$parent.showUploadDialog()
            }
          }
        },
        mulDelete: {
          name: "批量删除",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$parent.mulDelete()
            }
          }
        },
        commonForm: {
          name: "表单",
          type: "primary",
          plain: true,
          method: function (data, form, formList) {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$parent.showCommonFormDialog(data)
            }
          }
        }
      }
    }
  },
  methods: {
    toggleExpand(row, field) {
      const expandField = `expand${field}`
      this.$set(row, expandField, !row[expandField])
    },
    //计算表格操作按钮宽度
    getTableButtonWidth() {
      let num = 0
      let sumStr = ""
      const buttonList = this.tableConfig.tableButtonList || []
      if (buttonList.length > 0) {
        buttonList.forEach(item => {
          sumStr = sumStr + this.getButtonText(item)
        })
        num = sumStr.length * 19
      }
      return num + 20
    },
    //获取表格操作按钮显示文字
    getButtonText(item) {
      if (item && typeof item === "object") {
        if (item.buttonName) {
          return item.buttonName
        }
        const handler = this.buttonList[item.name]
        if (handler) {
          return handler.name
        }
      }
      const handler = this.buttonList[item]
      return handler ? handler.name : ""
    },
    //表格操作按钮点击
    handleTableButtonClick(item, row, index) {
      const handler = this.buttonList[item.name || item]
      if (handler && typeof handler.method === "function") {
        handler.method(item, row, index)
      } else if (item && typeof item.method === "function") {
        item.method(row, index)
      } else {
        this.$message.warning("该按钮未配置处理方法")
      }
    },

    //上传文件
    uploadFile(data) {
      let fileType = ["xls", "xlsx"]
      if (!fileType.includes(data.file.name.split(".").reverse()[0])) {
        return this.$message({
          message: "文件格式不正确,请重新上传",
          type: "error"
        })
      }
      //获取地址和请求方式以及是否放在请求头
      if (!this.urlConfig.hasOwnProperty("uploadUrlConfig")) {
        return this.$message.warning("请求配置不全,请核对")
      }
      let query = this.getQueryFormData()
      let requestData = this.resolveRequestConfig(this.urlConfig.uploadUrlConfig, query)
      if (!(requestData.url && requestData.type)) {
        return this.$message.warning("请求配置不全,请核对")
      }
      let params = new FormData()
      params.append(this.urlConfig.uploadUrlConfig.prop || "file", data.file)
      this.commonRequest(
        requestData.url,
        requestData.type,
        params,
        requestData.needRequestHeader == true,
        requestData.timeout
      )
        .then(res => {
          if (res.data.errorCode == "000000") {
            this.$message.success(res.data.errorMsg || "导入数据成功!")
            this.uploadDialogVisible = false
            this.queryTableData() //获取表格数据
          } else {
            this.$message.warning(res.data.errorMsg || "导入失败")
          }
        })
        .catch(error => {
          console.error(error)
          this.$message.warning("导入失败,请稍后重试")
        })
    },
    //计算表单宽度
    getCommonFormWidth(data) {
      if (data.width) {
        return data.width
      } else {
        let row = ((data.row && data.row > 3 ? 3 : data.row) || 2).toString()
        let newWidth = row * (Number(data.labelWidth) + 230 + 12) + 50 + 50 + "px" //弹窗两个padding+表单一个padding
        return newWidth
      }
    },
    //重置
    reset() {
      this.$refs.commonForm.$refs.form.resetFields()
    },
    //表格展开
    expandChange(row, expandedRows) {
      //判断是展开还是关闭
      if (expandedRows.length > 0) {
        let key = this.tableConfig.rowKey
        if (!key) {
          return
        }
        let index = expandedRows.findIndex(x => x[key] == row[key])
        if (index >= 0) this.$emit("expandChange", row)
      }
    },
    //码值转码
    getVal(tckey, data) {
      const store = this.$store
      const dictList = store && store.state && store.state.common && store.state.common.dictList
      let list =
        Array.isArray(tckey) && tckey.length > 0
          ? tckey
          : dictList && Array.isArray(dictList[tckey]) && dictList[tckey]

      let str = ""
      if (Array.isArray(list) && list.length > 0) {
        if (typeof data == "string" && (data.includes(",") || data.includes("."))) {
          let list1 = data.includes(",") ? data.split(",") : data.split(".")
          let list2 = []
          list1.forEach(y => {
            list.forEach(x => {
              if (x.key == y) {
                list2.push(x.val)
              }
            })
          })
          str = list2.join(" | ")
        } else {
          list.forEach(x => {
            if (x.key == data) {
              str = x.val
            }
          })
        }
      }
      return str == data ? data : str
    },
    // 根据中文获取码值
    getCode(params, code) {
      const store = this.$store
      const dictList = store && store.state && store.state.common && store.state.common.dictList
      let str = ""
      if (dictList && Array.isArray(dictList[params]) && dictList[params].length > 0) {
        dictList[params].forEach(x => {
          if (x.val == code) {
            str = x.key
          }
        })
      }
      return str ? str : code
    },
    //处理日期
    addDate(params) {
      if (params == null || params == " ") {
        return
      }
      let date = params.toString().trim()
      if (date.length >= 8) {
        let year = date.slice(0, 4)
        let month = date.slice(4, 6)
        let day = date.slice(6, 8)
        return year + "-" + month + "-" + day
      } else {
        return params
      }
    },
    //处理时间
    addTime(params) {
      if (params == null || [" ", ""].includes(params)) {
        return
      }
      //存在需要补0情况
      let len = 6 - params.toString().length
      let time = params.toString()
      if (len > 0) {
        for (let i = 1; i <= len; i++) {
          time = "0" + time
        }
      }
      let time1 = time.slice(0, 2)
      let time2 = time.slice(2, 4)
      let time3 = time.slice(4, 6)
      return time1 + ":" + time2 + ":" + time3
    },
    //删除日期中的横线
    delDate(params) {
      if (params == null) {
        return ""
      }
      return params.toString().replace(/-/g, "")
    },
    //补0
    addZero(params, length) {
      if (params == null) {
        return ""
      }
      //存在需要补0情况
      let len = length - params.toString().length
      let time = params.toString()
      if (len > 0) {
        for (let i = 1; i <= len; i++) {
          time = "0" + time
        }
      }
      return time
    },
    //获取日期
    getDate(params, isOnlyDate) {
      if (params == null || params === "") {
        return ""
      }
      let date = new Date(params)
      if (isNaN(date.getTime())) {
        return ""
      }
      const pad = n => (n > 9 ? n : "0" + n)
      const ymd = date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
      if (isOnlyDate) {
        return ymd
      }
      return ymd + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds())
    },
    //获取日期时间
    getDateTime(params) {
      return this.getDate(params)
    },
    /**
     * 字符串脱敏处理公共方法
     * @param {string} data - 要处理的字符串
     * @param {string} type - 脱敏类型：'name' | 'tel' | undefined
     * @returns {string} 脱敏后的字符串
     */
    desMethods(data, type) {
      const str = String(data || "").trim()
      if (!str) return ""
      if (!type) {
        return "*".repeat(str.length) || "*"
      }
      switch (type) {
        // 姓名脱敏
        case "name": {
          const len = str.length
          if (len === 1) return "*"
          if (len === 2) return str[0] + "*"
          return str[0] + "*" + str[len - 1]
        }
        // 手机号脱敏
        case "tel": {
          if (str.length === 11) {
            return str.slice(0, 3) + "****" + str.slice(7)
          }
          // 非11位：保留首尾，中间打码
          const len = str.length
          return str.length <= 1 ? "*" : str[0] + "*".repeat(len - 2 > 4 ? 4 : len - 2) + str[str.length - 1]
        }
        // 其他类型，按默认处理
        default:
          return "*".repeat(str.length)
      }
    },

    // 自适应表格列宽
    flexColumnWidth(prop, tableData, label, needGetVal, data) {
      // prop为该列的字段名(传字符串);tableData为该表格的数据源
      prop = prop + ""
      if (!tableData || tableData.length === 0) {
        return
      }
      if (!prop || prop === "undefined") {
        return
      }
      // 获取该列中最长的数据(内容)
      let columnContent = (tableData[0][prop] != null && tableData[0][prop].toString()) || ""
      tableData.forEach(x => {
        let nowStr = x[prop] == null ? "" : x[prop] + ""
        if (x[prop] != null && !!needGetVal) {
          nowStr = (this.getVal(data, x[prop]) || "") + ""
        }
        if (nowStr.length > columnContent.length) {
          columnContent = nowStr
        }
      })
      let flexWidth = this.getContentWidth(columnContent)
      //判断表头大小
      flexWidth = (label || "").length * 25 > flexWidth ? (label || "").length * 25 : flexWidth
      if (flexWidth > 260) {
        // 设置最大宽度
        flexWidth = 260
      }
      if (flexWidth < 90) {
        // 设置最小宽度
        flexWidth = 90
      }
      return flexWidth + "px"
    },
    //表格多选触发
    handleSelectionChange(val) {
      this.multipleSelection = val
    },
    //点击查询按钮触发
    submit() {
      this.currentPage = 1
      this.queryTableData() //获取表格数据
      this.$nextTick(() => {
        this.multipleSelection = []
        this.$refs.multipleTable.clearSelection()
      })
    },
    //分页页数改变
    currentPageChange(val) {
      this.currentPage = val
      this.queryTableData() //获取表格数据
    },
    //分页条数改变
    pageSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.queryTableData() //获取表格数据
    },
    //表格上传按钮点击触发
    showUploadDialog(data) {
      this.uploadDialogVisible = true
    },
    //下载excel(下载期间"下载excel"按钮置灰)
    download() {
      if (!this.urlConfig.hasOwnProperty("downloadUrlConfig")) {
        return this.$message.warning("请求配置不全,请核对")
      }
      let downloadUrlConfig = this.urlConfig.downloadUrlConfig
      let queryFormConfig = this.formConfig.queryFormConfig || {}
      let query = this.getQueryFormData()
      let requestData = this.resolveRequestConfig(downloadUrlConfig, query)
      if (!(requestData.url && requestData.type)) {
        return this.$message.warning("请求配置不全,请核对")
      }
      this.$refs.queryForm.$refs.form.validate(valid => {
        if (valid) {
          this.$refs.queryForm.downButton = true
          //数字类型、数组转字符串等参数处理
          query = this.formatQueryParams(query, queryFormConfig)
          this.commonDownload(requestData.url, requestData.type, {
            ...query,
            ...(downloadUrlConfig.data || {})
          })
            .then(() => {
              this.$refs.queryForm.downButton = false
            })
            .catch(() => {
              this.$refs.queryForm.downButton = false
            })
        } else {
          setTimeout(() => {
            let isError = document.getElementsByClassName("is-error")
            isError[0].scrollIntoView({
              block: "center",
              behavior: "smooth"
            })
          })
          return false
        }
      })
    },
    // 公共查询接口,
    queryTableData() {
      if (!this.urlConfig.hasOwnProperty("queryUrlConfig")) {
        return this.$message.warning("请求配置不全,请核对")
      }
      this.tableLoading = true
      this.tableData = []
      let query = this.getQueryFormData()
      let queryFormConfig = this.formConfig.queryFormConfig || {}
      let requestData = this.resolveRequestConfig(this.urlConfig.queryUrlConfig, query)
      if (!(requestData.url && requestData.type)) {
        this.tableLoading = false
        return this.$message.warning("请求配置不全,请核对")
      }
      //判断是否需要分页
      if (this.tableConfig.needPage != false) {
        query = {
          ...query,
          pageSize: this.pageSize,
          pageNum: this.currentPage
        }
      }
      //数字类型、数组转字符串等参数处理
      query = this.formatQueryParams(query, queryFormConfig)
      this.commonRequest(
        requestData.url,
        requestData.type,
        query,
        requestData.needRequestHeader == true,
        requestData.timeout
      )
        .then(res => {
          if (res.data.errorCode == "000000") {
            if (this.tableConfig.needPage != false) {
              this.total = res.data.total || 0
            }
            let data = Array.isArray(res.data.data) ? res.data.data : []
            if (data.length == 0) {
              this.$message.warning("查询为空")
            }
            if (queryFormConfig.dataTran) {
              this.tableData = queryFormConfig.dataTran(data)
            } else {
              this.tableData = data
            }
            if (queryFormConfig.mounMeth) {
              this.$nextTick(() => {
                this.tableData = queryFormConfig.mounMeth.call(this, this.tableData)
              })
            }
          } else {
            this.total = 0
            this.$message.error(res.data.message || res.data.errorMsg || "失败")
          }
        })
        .catch(() => {
          this.total = 0
          this.$message.error("查询失败,请稍后重试")
        })
        .finally(() => {
          this.tableLoading = false
        })
    },
    //显示公共表单
    showCommonFormDialog(name, title, data, formList) {
      let { formConfig } = this
      let currentCommonFormName = name + "FormConfig"
      if (!formConfig.hasOwnProperty(currentCommonFormName)) {
        return this.$message.warning("未找到表单对应配置")
      }
      let obj = {} //保存表单配置
      this.commonFormTitle = title
      let labelWidth =
        formConfig[currentCommonFormName].labelWidth ||
        this.getCommonFormLabelWidth(formConfig[currentCommonFormName].formList)
      let defaultForm = cloneDeep({ ...data, ...formConfig[currentCommonFormName].defaultForm })
      for (let key in defaultForm) {
        defaultForm[key] = [undefined, null].includes(defaultForm[key]) ? "" : defaultForm[key]
      }
      //判断是否有默认值
      if (!(Object.keys(defaultForm).length === 0 && defaultForm.constructor === Object)) {
        this.currentCommonFormDefaultForm = cloneDeep(defaultForm)
        obj = {
          ...formConfig[currentCommonFormName],
          defaultForm,
          labelWidth: labelWidth.toString()
        }
      } else {
        obj = {
          ...formConfig[currentCommonFormName],
          labelWidth: labelWidth.toString()
        }
      }
      if (Array.isArray(formList) && formList.length > 0) {
        obj.formList = formList
      }
      if (name.includes("detail") || name.includes("Detail")) {
        obj.needSubmit = false
      }
      this.currentCommonFormName = currentCommonFormName
      this.currentCommonFormUrlName = name + "UrlConfig"
      this.commonFormConfig = obj
      this.commonFormDialog = true
    },

    //公共表单提交
    commonFormSumbit() {
      this.$nextTick(() => {
        this.$refs.commonForm.$refs.form.validate((valid, fields) => {
          if (valid) {
            let query = cloneDeep(this.$refs.commonForm.form)
            let {
              currentCommonFormDefaultForm,
              currentCommonFormName,
              currentCommonFormUrlName,
              formConfig,
              urlConfig,
              tableConfig
            } = this
            let commonFormConfig = formConfig[currentCommonFormName]
            //判断是否有初始值
            let bol =
              tableConfig.needCheckMod !== false &&
              this.isMod == true &&
              !(
                Object.keys(currentCommonFormDefaultForm).length == 0 &&
                currentCommonFormDefaultForm.constructor == Object
              )
            if (bol) {
              let results = true
              let list = commonFormConfig.formList
              //判断是否修改
              if (Array.isArray(list) && list.length > 0) {
                list.forEach(x => {
                  if (query.hasOwnProperty(x.prop) && currentCommonFormDefaultForm.hasOwnProperty(x.prop)) {
                    let queryVal = query[x.prop]
                    if (x.needString && Array.isArray(queryVal)) {
                      queryVal = queryVal.join(",")
                    }
                    if (queryVal != currentCommonFormDefaultForm[x.prop]) {
                      results = false
                    }
                  }
                })
              }
              if (results) {
                return this.$message.warning("未修改数据,不需要提交")
              }
            }
            //数字类型、数组转字符串等参数处理
            query = this.formatQueryParams(query, commonFormConfig)
            if (commonFormConfig.hasOwnProperty("submitMethod") && typeof commonFormConfig.submitMethod == "function") {
              return this.isMod == true
                ? commonFormConfig.submitMethod(query, this.currentTableIndex)
                : commonFormConfig.submitMethod(query)
            }
            if (!urlConfig.hasOwnProperty(this.currentCommonFormUrlName)) {
              return this.$message.warning("请求配置不全,请核对")
            }
            //获取地址和请求方式等参数配置
            let requestData = this.resolveRequestConfig(urlConfig[currentCommonFormUrlName], query)
            if (!(requestData.url && requestData.type)) {
              return this.$message.warning("请求配置不全,请核对")
            }
            if (urlConfig[currentCommonFormUrlName].hasOwnProperty("data")) {
              query = {
                ...query,
                ...urlConfig[currentCommonFormUrlName].data
              }
            } else {
              query = cloneDeep(query)
            }
            this.commonRequest(requestData.url, requestData.type, query, requestData.needRequestHeader, requestData.timeout)
              .then(res => {
                if (res.data.errorCode == "000000") {
                  this.$message.success(res.data.message || res.data.errorMsg || "成功")
                  this.queryTableData() //获取表格数据
                  this.commonFormDialog = false
                } else {
                  this.$message.error(res.data.message || res.data.errorMsg || "失败")
                }
              })
              .catch(() => {
                this.$message.error("提交失败,请稍后重试")
              })
          } else {
            setTimeout(() => {
              let isError = document.getElementsByClassName("is-error")
              isError[0].scrollIntoView({
                block: "center",
                behavior: "smooth"
              })
            })
            return false
          }
        })
      })
    },
    //表格删除按钮
    del(data) {
      this.$confirm("是否确认删除？", "温馨提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      })
        .then(() => {
          return this.requestDelete(data)
        })
        .then(() => {
          this.queryTableData() //获取表格数据
        })
        .catch(() => {})
    },
    //批量删除
    mulDelete() {
      if (!this.multipleSelection || this.multipleSelection.length === 0) {
        return this.$message.warning("请先勾选需要删除的数据")
      }
      const rows = this.multipleSelection.slice()
      this.$confirm(`是否确认删除选中的 ${rows.length} 条数据？`, "温馨提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      })
        .then(async () => {
          //优先使用批量删除配置,未配置时复用单行删除配置
          const urlConfigName = this.urlConfig.hasOwnProperty("mulDelUrlConfig") ? "mulDelUrlConfig" : "delUrlConfig"
          for (const row of rows) {
            await this.requestDelete(row, urlConfigName, true)
          }
          this.$message.success("批量删除成功")
          this.queryTableData() //获取表格数据
          this.$nextTick(() => {
            this.multipleSelection = []
            this.$refs.multipleTable.clearSelection()
          })
        })
        .catch(() => {})
    },
    //删除请求(单行与批量共用)
    async requestDelete(data, urlConfigName = "delUrlConfig", silent = false) {
      const delUrlConfig = this.urlConfig[urlConfigName]
      if (!delUrlConfig) {
        this.$message.warning("请求配置不全,请核对")
        throw new Error("删除请求配置缺失")
      }
      let requestData = this.resolveRequestConfig(delUrlConfig, data)
      if (!(requestData.url && requestData.type)) {
        this.$message.warning("请求配置不全,请核对")
        throw new Error("删除请求配置缺失")
      }
      try {
        const res = await this.commonRequest(
          requestData.url,
          requestData.type,
          this.buildDelQuery(data, delUrlConfig),
          requestData.needRequestHeader,
          requestData.timeout
        )
        if (res.data.errorCode == "000000") {
          if (!silent) {
            this.$message.success(res.data.message || res.data.errorMsg || "成功")
          }
        } else {
          this.$message.error(res.data.message || res.data.errorMsg || "失败")
          throw new Error("删除业务失败")
        }
      } catch (error) {
        if (error && error.message === "删除业务失败") {
          throw error
        }
        this.$message.error("删除失败,请稍后重试")
        throw error
      }
    },
    //构建删除请求参数
    buildDelQuery(data, delUrlConfig) {
      let query = {}
      if (delUrlConfig.hasOwnProperty("data")) {
        if (Array.isArray(delUrlConfig.data) && delUrlConfig.data.length > 0) {
          delUrlConfig.data.forEach(x => {
            query[x] = data[x] || ""
          })
        } else {
          query[delUrlConfig.data] = data[delUrlConfig.data] || ""
        }
      } else {
        query = cloneDeep(data)
      }
      return query
    },
    //获取查询表单数据
    getQueryFormData() {
      const queryForm = this.$refs.queryForm
      return cloneDeep((queryForm && queryForm.form) || {})
    },
    //解析请求配置(支持对象或函数形式)
    resolveRequestConfig(urlConfig, query) {
      if (typeof urlConfig === "function") {
        return urlConfig(query) || {}
      }
      return {
        ...urlConfig,
        timeout: urlConfig.timeout || REQUEST_TIMEOUT
      }
    },
    //查询参数统一处理:数字类型转换、数组转字符串
    formatQueryParams(query, formConfig) {
      const result = { ...query }
      if (formConfig && formConfig.needNumPropList && Array.isArray(formConfig.needNumPropList)) {
        for (let key in result) {
          if (formConfig.needNumPropList.includes(key)) {
            result[key] = result[key] ? Number(result[key]) : ""
          }
        }
      }
      if (formConfig && Array.isArray(formConfig.formList)) {
        formConfig.formList.forEach(x => {
          if (x.needString == true && ["select", "checkBox"].includes(x.type)) {
            result[x.prop] = Array.isArray(result[x.prop]) ? result[x.prop].join(",") : ""
          }
        })
      }
      return result
    },
    //公共请求方法:与旧版 method.js 的 commonRequest 参数保持一致;
    //非 put/post 请求一律走 query 参数(get/delete 携带请求体不符合常规后端约定)
    commonRequest(url, type, data, isNeedRequestHeader, timeout) {
      // FormData 始终作为 multipart 请求体发送
      if (data instanceof FormData) {
        return (this.request || defaultRequest)({ url, method: type, data, headers: {}, timeout })
      }
      if (["put", "post"].includes(type)) {
        //判断是否需要放在请求头里
        if (isNeedRequestHeader === true) {
          return (this.request || defaultRequest)({
            url,
            method: type,
            params: data,
            headers: {},
            timeout
          })
        } else {
          return (this.request || defaultRequest)({
            url,
            method: type,
            data,
            headers: { "Content-Type": "application/json" },
            timeout
          })
        }
      } else {
        return (this.request || defaultRequest)({
          url,
          method: type,
          params: data,
          headers: {},
          timeout
        })
      }
    },
    //下载表格公共方法
    commonDownload(url, type, query, timeout) {
      if (["put", "post"].includes(type)) {
        return (this.request || defaultRequest)({
          url,
          method: type,
          responseType: "blob",
          data: query,
          params: {},
          headers: { "Content-Type": "application/json" },
          timeout
        })
      } else {
        return (this.request || defaultRequest)({
          url,
          method: type,
          responseType: "blob",
          params: query,
          headers: {},
          timeout
        })
      }
    },
    //获取公共表单labelwidth
    getCommonFormLabelWidth(list) {
      let labelWidth = 0
      if (list && Array.isArray(list)) {
        list.forEach(x => {
          let width = this.getContentWidth(x.label)
          labelWidth = width > labelWidth ? Math.floor(width) : labelWidth
        })
      }
      return labelWidth
    },
    //获取内容宽度
    getContentWidth(data) {
      if (!data) return 0
      let width = 0
      let str = data.toString().trim()
      for (let char of str) {
        //英文字符
        if ((char >= "A" && char <= "Z") || (char >= "a" && char <= "z")) {
          width += 12.5
        }
        //中文
        else if (char >= "\u4e00" && char <= "\u9fa5") {
          width += 19
        } else {
          width += 9
        }
      }
      return width
    }
  },
  mounted() {
    if (["local"].includes(getEnv().ENV_CONFIG)) {
      this.submit()
    }
    const queryFormConfig = this.formConfig.queryFormConfig
    if (queryFormConfig && queryFormConfig.mounMeth) {
      this.tableData = queryFormConfig.mounMeth.call(this, this.tableData)
    }
  }
}
</script>
<style lang="scss" scoped>
$tableHeight: var(--tableHeight, 35px);
::v-deep .el-table td {
  padding: 1px;
  white-space: nowrap;
  width: fit-content;
  .cell {
    padding-left: 5px !important;
    padding-right: 5px !important;
  }
}
//表格宽度
::v-deep .el-table__row {
  height: $tableHeight;
}
.operButton {
  margin-left: 8px;
  :first-child {
    margin-left: 0px;
  }
}
//处理fix定位之后左边框不显示的问题
::v-deep .el-table {
  thead th:not(.is-hidden):last-child {
    border-left: 1px solid #ebeef5;
  }
  .el-table__row {
    td:not(.is-hidden):last-child {
      border-left: 1px solid #ebeef5;
    }
  }
}
//解决操作栏横线问题
::v-deep .el-table__fixed {
  height: 100% !important;
}
::v-deep .el-table__fixed-right {
  height: 100% !important;
}
::v-deep .el-dialog {
  max-height: 520px;
  overflow: auto;
}
::v-deep .el-dialog__wrapper {
  overflow: visible;
}
::v-deep .addModDialog {
  .el-dialog__body {
    padding-bottom: 0;
  }
  .el-dialog__footer {
    padding-top: 0;
  }
}
//修改/详情置灰下样式优化
::v-deep .addModDialog {
  .is-disabled .el-input__inner {
    color: black !important;
  }
  .is-disabled .el-textarea__inner {
    color: black !important;
  }
}
.form-container {
  .is-disabled .el-input__inner {
    color: black !important;
  }
  .is-disabled .el-textarea__inner {
    color: black !important;
  }
}
::v-deep .commonFormDialog {
  .el-dialog__body {
    padding-bottom: 0;
  }
  .el-dialog__footer {
    padding-top: 0;
  }
  .is-disabled .el-input__inner {
    color: black !important;
  }
  .is-disabled .el-textarea__inner {
    color: black !important;
  }
}
::v-deep .selectTree {
  .el-select-dropdown {
    .el-select-dropdown__wrap {
      max-height: 400px !important;
    }
    .el-scrollbar__bar.is-vertical {
      width: 8px !important;
    }
  }
}
.table-container {
  .expandable-content {
    width: 100%;

    /* 折叠状态样式（明确类名） */
    .content-collapse {
      display: -webkit-box;
      -webkit-line-clamp: 3; /* 核心属性，必须带 -webkit- 前缀 */
      /*! autoprefixer: ignore next */ /* 防止构建工具删除下一行 */
      -webkit-box-orient: vertical !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
      word-wrap: break-word;
    }

    /* 展开状态样式 */
    .content-expanded {
      white-space: normal;
      word-wrap: break-word;
      overflow: visible;
      /* 确保展开后内容完全显示 */
    }

    /* 按钮样式优化 */
    .el-button {
      margin-top: 5px;
      color: #409eff;
    }
  }
}
</style>
