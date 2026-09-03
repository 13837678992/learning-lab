<template>
  <div class="form-component-container" :id="formContainerId">
    <el-form
      ref="form"
      :model="form"
      class="form-component-body"
      :label-position="formConfig.labelPosition || 'right'"
      :label-width="commonLabelWidth + 'px'"
      :validate-on-rule-change="false"
      :inline="formConfig.inline == true || inline"
    >
      <el-form-item
        :label="item.label"
        :prop="item.prop"
        :rules="[...getRules(item, form)]"
        v-for="(item, index) in formList"
        :key="index"
        v-show="showMethod(item, form)"
      >
        <div v-if="item.type == 'selectTree'">
          <el-select
            v-model="form[item.prop]"
            :class="item.class || ''"
            :placeholder="item.placeholder ? item.placeholder : '请选择' + item.label"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            :ref="'selectTree' + item.prop"
            filterable
            class="selectTree"
            clearable
            :disabled="getDisabled(item)"
            :popper-append-to-body="false"
            :filter-method="a => filterMethod(a, item)"
            @blur="a => selectTreeBlur(a, item)"
            @focus="a => selectTreeFocus(a, item)"
          >
            <el-option
              style="height: auto; padding: 0"
              :label="
                item.showKey ? treeValue[item.nodeKey] + ': ' + treeValue[item.labelProp] : treeValue[item.nodeKey]
              "
              :value="treeValue[item.nodeKey]"
            >
              <el-tree
                v-if="selectTreeShow"
                accordion
                style="font-weight: 400"
                :expand-on-click-node="false"
                :default-expand-all="isExpanded"
                highlight-current
                @node-click="nodeClick($event, item)"
                :node-key="item.nodeKey"
                :ref="'tree' + item.prop"
                :data="item.treeData"
                :props="{
                  children: 'children',
                  label: item.labelProp
                }"
                :current-node-key="form[item.prop]"
                :default-expanded-keys="[form[item.prop]]"
                :filter-node-method="(a, b) => filterNodeMethod(a, b, item)"
              >
                <span slot-scope="{ data }" class="cutstom-tree-node">
                  <span v-if="Array.isArray(data[item.childrenProp]) && data[item.childrenProp].length > 0">
                    <i
                      class="fa fa-folder-o"
                      style="background: #ffd767; color: #ffd767; font-weight: 500"
                      aria-hidden="true"
                    />
                  </span>
                  <span v-else>
                    <i
                      class="fa fa-file-text-o"
                      aria-hidden="true"
                      style="background: #a1c4fd; color: #a1c4fd; font-weight: 500"
                    />
                  </span>
                  <span style="font-size: 15px">
                    {{
                      Array.isArray(data[item.childrenProp]) && data[item.childrenProp].length > 0
                        ? data[item.nodeKey] + " | " + data[item.labelProp] + "(" + data[item.childrenProp].length + ")"
                        : data[item.nodeKey] + " | " + data[item.labelProp]
                    }}
                  </span>
                </span>
              </el-tree>
            </el-option>
          </el-select>
        </div>
        <div v-if="item.type == 'cascader'">
          <el-cascader
            :show-all-levels="false"
            :options="item.data"
            :props="{
              expandTrigger: item.expandTrigger ? item.expandTrigger : 'click',
              multiple: item.multiple == true
            }"
            filterable
            collapse-tags
            clearable
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            @change="formMethods(item, index, 'change')"
            @clear="formMethods(item, index, 'clear')"
            v-model="form[item.prop]"
            :class="item.class || ''"
            :placeholder="item.placeholder ? item.placeholder : '请选择' + item.label"
          ></el-cascader>
        </div>
        <div v-if="item.type == 'input'">
          <el-input
            v-model="form[item.prop]"
            :class="item.class || ''"
            :placeholder="item.placeholder ? item.placeholder : '请输入' + item.label"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            :disabled="getDisabled(item)"
            :maxlength="item.maxlength"
            clearable
            :multiple="item.multiple"
            @input="formMethods(item, index, 'input')"
            @blur="formMethods(item, index, 'blur')"
            :show-word-limit="item.showWordLimit != false"
            @clear="formMethods(item, index, 'clear')"
          ></el-input>
          <span v-if="item.slotName" class="slot">
            <slot :name="item.slotName" :row="{ item, form }"></slot>
          </span>
        </div>
        <div v-if="item.type == 'inputNumber'">
          <el-input-number
            v-model.trim="form[item.prop]"
            :placeholder="item.placeholder ? item.placeholder : '请输入' + item.label"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            :disabled="getDisabled(item)"
            :maxlength="item.maxlength"
            clearable
            :multiple="item.multiple"
            :min="item.min || (item.allowNegative == true ? -Infinity : 0)"
            :max="item.max || (item.maxlength && parseFloat(`${'9'.repeat(item.maxlength)}.99`)) || Infinity"
            :precision="item.precision === 0 ? 0 : item.precision || 2"
            :controls="item.controls != null ? item.controls : true"
            @change="formMethods(item, index, 'change')"
            :show-word-limit="item.showWordLimit != false"
            @clear="formMethods(item, index, 'clear')"
            @blur="formMethods(item, index, 'blur')"
            @input="formMethods(item, index, 'input')"
          ></el-input-number>
          <span v-if="item.slotName" class="slot">
            <slot :name="item.slotName" :row="{ item, form }"></slot>
          </span>
        </div>
        <div v-if="item.type == 'textarea'">
          <el-input
            type="textarea"
            v-model.trim="form[item.prop]"
            :placeholder="item.placeholder ? item.placeholder : '请输入' + item.label"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            :autosize="{ minRows: item.minRows || 2, maxRows: item.maxRows || 6 }"
            :disabled="getDisabled(item)"
            :maxlength="item.maxlength"
            :show-word-limit="item.showWordLimit != false"
            @input="formMethods(item, index, 'input')"
            @blur="formMethods(item, index, 'blur')"
          ></el-input>
          <span v-if="item.slotName" class="slot">
            <slot :name="item.slotName" :row="{ item, form }"></slot>
          </span>
        </div>
        <div v-if="item.type == 'select'">
          <el-select
            v-model="form[item.prop]"
            :popper-class="item.class || ''"
            :disabled="getDisabled(item)"
            :placeholder="item.placeholder ? item.placeholder : '请选择' + item.label"
            clearable
            filterable
            :ref="item.prop + 'Ref'"
            :multiple="!!item.multiple"
            :collapse-tags="item.collapseTags == true"
            @change="formMethods(item, index, 'change')"
            @clear="formMethods(item, index, 'clear')"
            @focus="formMethods(item, index, 'focus')"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            :remote="!!item.remote"
            reserve-keyword
            :remote-method="item.remoteMethod"
          >
            <el-option
              v-for="(itemChild, index) in item.selectList || dictList(item)"
              :key="index"
              :label="item.showKey ? itemChild.key + ': ' + itemChild.val : itemChild.val"
              :value="itemChild.key"
            ></el-option>
          </el-select>
          <span v-if="item.slotName" class="slot">
            <slot :name="item.slotName" :row="{ item, form }"></slot>
          </span>
        </div>
        <div v-if="item.type == 'date'">
          <el-date-picker
            v-model="form[item.prop]"
            :class="item.class || ''"
            :disabled="getDisabled(item)"
            :placeholder="item.placeholder ? item.placeholder : '请选择' + item.label"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            type="date"
            :value-format="item.valueFormat || 'yyyyMMdd'"
            clearable
            @clear="formMethods(item, index, 'clear')"
            :picker-options="pickerOptions(item)"
          ></el-date-picker>
        </div>
        <div v-if="item.type == 'year'">
          <el-date-picker
            :disabled="getDisabled(item)"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            v-model="form[item.prop]"
            :class="item.class || ''"
            type="year"
            placeholder="请选择年份"
            :value-format="item.valueFormat || 'yyyy'"
            clearable
            @clear="formMethods(item, index, 'clear')"
          ></el-date-picker>
        </div>
        <div v-if="item.type == 'month'">
          <el-date-picker
            :disabled="getDisabled(item)"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            v-model="form[item.prop]"
            :class="item.class || ''"
            type="month"
            :format="item.format || 'MM 月'"
            placeholder="请选择月份"
            :value-format="item.valueFormat || 'MM'"
            clearable
            @clear="formMethods(item, index, 'clear')"
          ></el-date-picker>
        </div>
        <div v-if="item.type == 'time'">
          <el-time-picker
            v-model="form[item.prop]"
            :class="item.class || ''"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            :disabled="getDisabled(item)"
            :placeholder="item.placeholder ? item.placeholder : '请选择' + item.label"
            clearable
            @clear="formMethods(item, index, 'clear')"
            :value-format="item.valueFormat || 'HHmmss'"
          ></el-time-picker>
        </div>
        <div v-if="item.type == 'dateTime'">
          <el-date-picker
            v-model="form[item.prop]"
            :class="item.class || ''"
            :disabled="getDisabled(item)"
            placeholder="请选择日期时间"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            type="datetime"
            :value-format="item.valueFormat || 'yyyyMMddHHmmss'"
            clearable
            @clear="formMethods(item, index, 'clear')"
            :picker-options="pickerOptions(item)"
          ></el-date-picker>
        </div>
        <div v-if="item.type == 'radioGroup'">
          <el-radio-group
            v-model="form[item.prop]"
            :class="item.class || ''"
            @change="formMethods(item, index, 'change')"
          >
            <el-radio
              :label="item.key"
              :key="index"
              :disabled="getDisabled(item)"
              v-for="(item, index) in item.radioGroupList"
            >
              {{ item.val }}
            </el-radio>
          </el-radio-group>
        </div>
        <div v-if="item.type == 'checkBox'">
          <el-checkbox-group v-model="form[item.prop]" :class="item.class || ''">
            <el-checkbox
              :label="item1.key"
              :key="index"
              v-for="(item1, index) in item.checkBoxList || dictList(item)"
              :disabled="item1.disabled"
            >
              {{ item1.val }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <div v-if="item.type == 'password'">
          <el-input
            type="password"
            v-model="form[item.prop]"
            :class="item.class || ''"
            :placeholder="item.placeholder ? item.placeholder : '请输入' + item.label"
            :style="{
              width: item.width ? item.width.toString().replace('px', '') + 'px' : commonWidth + 'px'
            }"
            :show-password="true"
            :disabled="getDisabled(item)"
            :maxlength="item.maxlength"
            clearable
            :multiple="item.multiple"
            @input="formMethods(item, index, 'input')"
            @blur="formMethods(item, index, 'blur')"
            :show-word-limit="item.showWordLimit != false"
            @clear="formMethods(item, index, 'clear')"
          ></el-input>
          <span v-if="item.slotName" class="slot">
            <slot :name="item.slotName" :row="{ item, form }"></slot>
          </span>
        </div>
      </el-form-item>
    </el-form>
    <div
      class="form-component-buttons"
      v-if="
        formConfig.hasOwnProperty('buttonShowList') &&
          Array.isArray(formConfig.buttonShowList) &&
          formConfig.buttonShowList.length > 0
      "
    >
      <span>
        <el-button
          v-for="(item, index) in formConfig.buttonShowList"
          :key="index"
          v-show="item.showMethod ? item.showMethod(item, form) : true"
          @click="buttonClick(item)"
          :type="(item.name || item) == 'submit' ? 'primary' : buttonList[item.name || item].type || 'default'"
          :plain="buttonList[item.name || item].plain == true"
          :disabled="(item.name || item) == 'download' ? downButton : getButtonDisabled(item)"
        >
          {{ item.buttonName || buttonList[item.name || item].name || "" }}
        </el-button>
      </span>
    </div>
  </div>
</template>

<script>
import dayjs from "dayjs"

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

// 稳定的对象字符串化(用于 select 缓存 key)
function stableStringify(obj) {
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`
  }
  if (obj && typeof obj === "object") {
    return `{${Object.keys(obj)
      .sort()
      .map(k => `"${k}":${stableStringify(obj[k])}`)
      .join(",")}}`
  }
  return JSON.stringify(obj)
}

export default {
  name: "Form",
  props: {
    //表单所有配置(字段语义与 Crud 组件的 formList 完全一致)
    formConfig: {
      type: Object,
      required: true,
      default: () => {
        return {}
      }
    },
    //按钮注册表(共享架构扩展点):与内置按钮合并,可覆盖/新增按钮。
    //每个按钮:{ name(显示文字), type, plain, method }
    //method 调用契约:this 为表单组件实例,参数 (buttonItem, form, formList)
    buttons: {
      type: Object,
      default: () => {
        return {}
      }
    },
    //强制行内布局(Crud 复用本组件时传 true 保持历史行为)
    inline: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    formConfig: {
      handler() {
        this.formList = cloneDeep(this.formConfig.formList)
        this.getForm()
        this.getLabelWidth()
      },
      immediate: true,
      deep: true
    }
  },
  data() {
    return {
      formContainerId: "formComponent" + new Date().getTime().toString(), //表单id
      selectTreeShow: true, //渲染树形
      isExpanded: false, //是否默认全部展开
      treeValue: {}, //绑定的某个值
      formList: [], //深克隆表单配置
      commonLabelWidth: 0, //表单宽度
      commonWidth: 220, //表单控件宽度
      form: {}, //表单
      downButton: false, //下载按钮置灰(Crud 复用场景)
      cacheMapOptinon: {}
    }
  },
  computed: {
    //按钮注册表:内置按钮 + buttons prop 扩展(后者覆盖同名按钮)
    buttonList() {
      return {
        submit: {
          name: "提交",
          type: "primary",
          method: (data, form, formList) => {
            this.$refs.form.validate(valid => {
              if (valid) {
                //自定义按钮方法 > formConfig.submitMethod > submit 事件
                if (data.method) {
                  data.method(this.getData(), form, formList)
                } else if (this.formConfig.submitMethod) {
                  this.formConfig.submitMethod(this.getData(), form, formList)
                } else {
                  this.$emit("submit", this.getData())
                }
              } else {
                this.scrollToFirstError()
              }
            })
          }
        },
        reset: {
          name: "重置",
          method: (data, form, formList) => {
            if (data.method) {
              data.method(form, formList)
            } else {
              this.$refs.form.resetFields()
              this.getForm()
            }
          }
        },
        default: {
          name: "默认",
          method: (data, form, formList) => {
            if (data.method) {
              data.method(form, formList)
            } else {
              console.log("默认按钮触发了")
            }
          }
        },
        defaultValidate: {
          name: "默认",
          method: (data, form, formList) => {
            this.$refs.form.validate(valid => {
              if (valid) {
                if (data.method) {
                  data.method(form, formList)
                } else {
                  console.log("默认按钮触发了")
                }
              } else {
                this.scrollToFirstError()
              }
            })
          }
        },
        ...this.buttons
      }
    }
  },
  created() {
    if (Array.isArray(this.formConfig.formList)) {
      this.formConfig.formList.forEach((it, ind) => {
        it.focusMethod && this.formMethods(it, ind, "focus")
      })
    }
  },
  methods: {
    //暴露给父组件:校验
    validate(callback) {
      this.$refs.form.validate(callback)
    },
    //字典选项:优先 selectList,其次 Vuex $store 字典(兼容两种宿主)
    dictList(item) {
      const store = this.$store
      const dict = store && store.state && store.state.common && store.state.common.dictList
      return (dict && Array.isArray(dict[item.tcKey]) && dict[item.tcKey]) || []
    },
    //暴露给父组件:重置(恢复默认值)
    reset() {
      this.$refs.form.resetFields()
      this.getForm()
    },
    //暴露给父组件:获取收集的数据(已做数字转换/数组转字符串处理)
    getData() {
      return this.formatFormData(cloneDeep(this.form))
    },
    //暴露给父组件:预填/回显数据(仅更新 formList 中声明的字段)
    setData(data) {
      if (!data || typeof data !== "object") {
        return
      }
      Object.keys(data).forEach(key => {
        if (this.form.hasOwnProperty(key)) {
          this.form[key] = data[key]
        }
      })
    },
    //数据统一处理:数字类型转换、数组转字符串
    formatFormData(form) {
      const result = { ...form }
      if (this.formConfig && this.formConfig.needNumPropList && Array.isArray(this.formConfig.needNumPropList)) {
        for (let key in result) {
          if (this.formConfig.needNumPropList.includes(key)) {
            result[key] = result[key] ? Number(result[key]) : ""
          }
        }
      }
      if (this.formConfig && Array.isArray(this.formConfig.formList)) {
        this.formConfig.formList.forEach(x => {
          if (x.needString == true && ["select", "checkBox"].includes(x.type)) {
            result[x.prop] = Array.isArray(result[x.prop]) ? result[x.prop].join(",") : ""
          }
        })
      }
      return result
    },
    getButtonDisabled(item) {
      if (!item.hasOwnProperty("disabled")) return false
      if (typeof item.disabled == "function") {
        return item.disabled(this.form, this.formList)
      }
      if ([false, true].includes(item.disabled)) {
        return item.disabled
      }
      return false
    },
    //动态处理表单控件是否置灰
    getDisabled(item) {
      if (!item.hasOwnProperty("disabled")) return false
      if (typeof item.disabled == "function") {
        return item.disabled(this.form[item.prop], this.form, this.formList)
      }
      if ([false, true].includes(item.disabled)) {
        return item.disabled
      }
      return false
    },
    //按钮点击:按钮 method 的 this 为表单实例,参数 (buttonItem, form, formList)
    buttonClick(data) {
      const entry = this.buttonList[data.name || data]
      if (entry && typeof entry.method === "function") {
        entry.method.call(this, data, this.form, this.formList)
      } else if (data && typeof data.method === "function") {
        data.method(this.form, this.formList)
      } else {
        this.$message.warning("该按钮未配置处理方法")
      }
    },
    //校验失败滚动到第一个错误项
    scrollToFirstError() {
      setTimeout(() => {
        let isError = document.getElementsByClassName("is-error")
        if (isError[0]) {
          isError[0].scrollIntoView({
            block: "center",
            behavior: "smooth"
          })
        }
      })
    },
    //是否显示
    showMethod(item, form) {
      let a = true
      if ([true, false].includes(item.showMethod)) {
        a = item.showMethod
      } else if (typeof item.showMethod == "function") {
        a = item.showMethod(form[item.prop], form)
      }
      return a
    },
    //处理表单校验
    getRules(data, form) {
      let list = []
      if (typeof data.required == "function") {
        let bol = data.required(data, form)
        list.push({
          required: bol,
          message: data.label + "不能为空",
          trigger: ["select", "checkBox", "date", "year"].includes(data.type) ? "change" : "blur"
        })
      } else if ([true, false].includes(data.required)) {
        list.push({
          required: data.required,
          message: data.label + "不能为空",
          trigger: ["select", "checkBox", "date", "year"].includes(data.type) ? "change" : "blur"
        })
      }
      //判断是否有自定义
      let rules = data.rules
      if (rules && Array.isArray(rules) && rules.length > 0) {
        rules.forEach(x => {
          if (x.validator) {
            list.push({
              ...x,
              validator: (rule, value, callback) => {
                return x.validator(rule, value, callback, form)
              }
            })
          } else {
            list.push(x)
          }
        })
      }
      return list
    },
    //计算表单LabelWidth
    getLabelWidth() {
      if (this.formList && this.formList.labelWidth) {
        return (this.commonLabelWidth = this.formList.labelWidth.toString().replace("px", ""))
      }
      let labelWidth = 0
      let list = this.formList
      if (Array.isArray(list) && list.length > 0) {
        list.forEach(x => {
          let width = this.getContentWidth(x.label)
          labelWidth = width > labelWidth ? width : labelWidth
        })
      }
      this.commonLabelWidth = labelWidth > 80 ? labelWidth : 80
    },
    //或者内容宽度
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
          width += 18
        } else {
          width += 9
        }
      }
      return width
    },
    //树形
    selectTreeFocus(a, item) {
      this.selectTreeShow = false
      setTimeout(() => {
        this.selectTreeShow = true
      }, 100)
    },
    //树形blur事件
    selectTreeBlur(a, item) {
      this.$refs.form.validateField(item.prop)
    },
    //树形节点点击
    nodeClick(data, item) {
      this.treeValue = data
      this.form[item.prop] = data[item.nodeKey]
      if (item.nodeClickMethod) {
        item.nodeClickMethod(data, this.form)
      }
      this.$nextTick(() => {
        this.$refs["selectTree" + item.prop][0].blur() //下拉框消失
        this.$refs.form.clearValidate(item.prop)
        let nodes = this.$refs["tree" + item.prop][0].store.nodesMap
        for (let key in nodes) {
          nodes[key].expanded = false
          if (nodes[key].childNodes.length > 0) {
            nodes[key].childNodes.forEach(x => {
              x.expanded = false
            })
          }
        }
        this.isExpanded = false
      })
    },
    //搜索逻辑
    filterMethod(data, item) {
      this.$nextTick(() => {
        if (data) {
          this.$refs["tree" + item.prop][0].filter(data)
        } else {
          let nodes = this.$refs["tree" + item.prop][0].store.nodesMap
          for (let key in nodes) {
            nodes[key].expanded = false
            if (nodes[key].childNodes.length > 0) {
              nodes[key].childNodes.forEach(x => {
                x.expanded = false
              })
            }
          }
          this.isExpanded = false
        }
      })
    },
    //tree节点过滤
    filterNodeMethod(value, data, item) {
      if (!value) {
        return true
      } else {
        return (
          String(data[item.labelProp]).indexOf(value) !== -1 || String(data[item.nodeKey]).indexOf(value) !== -1
        )
      }
    },

    //获取参数
    getFormData(data) {
      let formConfig = this.formConfig
      if (formConfig.hasOwnProperty("defaultForm")) {
        const value =
          formConfig.defaultForm[data.prop] === 0
            ? "0"
            : Array.isArray(formConfig.defaultForm[data.prop] || "")
            ? formConfig.defaultForm[data.prop]
            : (formConfig.defaultForm[data.prop] || "").toString().trim()
        if (data.type == "date") {
          if (value && value.length == (data.valueFormat || "yyyyMMdd").length) {
            return value || dayjs(value).format((data.valueFormat || "yyyyMMdd").toUpperCase())
          } else {
            return ""
          }
        } else if (data.type == "time") {
          if (value && value.length == (data.valueFormat || "HHmmss").length) {
            return value
          } else {
            return ""
          }
        } else if (["cascader", "checkBox"].includes(data.type) || (data.type == "select" && data.multiple == true)) {
          let list = []
          if (value) {
            if (Array.isArray(value)) {
              list = value
            } else if (value.includes(",") || value.includes(".")) {
              list = value.includes(",") ? value.split(",") : value.split(".")
            } else {
              list = [value]
            }
          }
          return list
        } else if (data.type == "inputNumber") {
          return value == "" ? 0 : Number(value)
        } else {
          return value
        }
      } else {
        if (["cascader", "checkBox"].includes(data.type) || (data.type == "select" && data.multiple == true)) {
          return []
        } else if (data.type == "inputNumber") {
          return 0
        } else {
          return ""
        }
      }
    },
    //处理表单组件v-model
    getForm() {
      this.form = {}
      let list = this.formList
      if (Array.isArray(list) && list.length > 0) {
        list.forEach(x => {
          this.$set(this.form, x.prop, this.getFormData(x))
        })
      }
    },
    //日期禁止时间方法
    pickerOptions(data) {
      if (!data.noCheckDate) {
        if (!!data.isStartDate) {
          return {
            disabledDate: time => {
              let dateMethodDisabled = false
              let dateDisabled = false
              // 获取表单中的结束日期
              let endDate = this.form[data.endDateProp || "endDate"]

              if (endDate) {
                let endDayjs = dayjs(endDate).format("YYYY-MM-DD")
                let endTime = new Date(endDayjs).getTime()

                // 配置项：跨度数值 和 单位 (默认 'day')
                let num = data.disabledDateNum || 0
                let unit = data.dateUnit || "day"
                if (num > 0) {
                  if (unit === "year") {
                    // 【按年计算】结束日期往前推 N 年
                    // 逻辑：开始时间 < (结束日期 - N年) 或者 开始时间 > 结束日期
                    let minTime = dayjs(endDayjs)
                      .subtract(num, "year")
                      .startOf("day")
                      .valueOf()
                    dateDisabled = time.getTime() < minTime || time.getTime() > endTime
                  } else {
                    // 【按天计算】原有逻辑
                    let milliSecondsPerDay = 24 * 60 * 60 * 1000
                    let minTime = endTime - num * milliSecondsPerDay
                    dateDisabled = time.getTime() < minTime || time.getTime() > endTime
                  }
                } else {
                  // 没有配置跨度，默认只能选结束日期当天或之前（根据原逻辑：time > endTime 被禁用，即只能选 <= endTime）
                  // 原逻辑中若无 num，通常只限制不能大于结束日期
                  dateDisabled = time.getTime() > endTime
                }
              }

              if (data.disabledMethods) {
                dateMethodDisabled = data.disabledMethods(dayjs(time).format("YYYYMMDD"))
              }
              return dateMethodDisabled || dateDisabled
            }
          }
        } else {
          return {
            disabledDate: time => {
              let dateMethodDisabled = false
              let dateDisabled = false
              let beginDate = this.form[data.startDateProp || "startDate"]

              if (beginDate) {
                // 使用 dayjs 标准化开始日期
                let startDayjs = dayjs(beginDate).format("YYYY-MM-DD")
                let startTime = new Date(startDayjs).getTime()

                // 获取跨度和单位 (默认单位 'day')
                let num = data.disabledDateNum || 0
                let unit = data.dateUnit || "day"

                if (num > 0) {
                  if (unit === "year") {
                    // 【按年计算】开始日期 加上 N 年
                    // 注意：保持原逻辑习惯，通常结束日期包含当天，所以这里计算最大允许时间
                    let maxAllowedTime = dayjs(startDayjs)
                      .add(num, "year")
                      .endOf("day")
                      .valueOf()
                    let minAllowedTime = dayjs(startDayjs)
                      .subtract(1, "day")
                      .endOf("day")
                      .valueOf() // 保持原逻辑：不能早于开始日期前一天

                    // 逻辑：时间 > (开始日期 + N年) 或者 时间 < (开始日期 - 1天)
                    dateDisabled = time.getTime() > maxAllowedTime || time.getTime() < minAllowedTime
                  } else {
                    // 【按天计算】原有逻辑
                    let milliSecondsPerDay = 24 * 60 * 60 * 1000
                    let maxAllowedTime = startTime + num * milliSecondsPerDay
                    let minAllowedTime = startTime - 1 * milliSecondsPerDay

                    dateDisabled = time.getTime() > maxAllowedTime || time.getTime() < minAllowedTime
                  }
                } else {
                  // 没有配置跨度，默认只能选开始日期当天或之后
                  let minAllowedTime = startTime - 1 * 24 * 60 * 60 * 1000
                  dateDisabled = time.getTime() < minAllowedTime
                }
              }

              if (data.disabledMethods) {
                dateMethodDisabled = data.disabledMethods(dayjs(time).format("YYYYMMDD"))
              }
              return dateMethodDisabled || dateDisabled
            }
          }
        }
      }
    },
    formMethods(data, ind, type) {
      let method = type + "Method"
      let refName = data.prop + "Ref"
      if (data[method]) {
        if (type == "focus") {
          if (data.cache == undefined || data.cache.length == 0) {
            if (!(this.formList[ind].selectList && this.formList[ind].selectList.length)) {
              data[method](
                this.form[data.prop],
                this.form,
                this.formList,
                (this.$refs[refName] && this.$refs[refName][0]) || ""
              ).then(res => {
                this.$set(this.formList[ind], "selectList", res)
              })
            } else {
              return
            }
          } else {
            let key = ""
            data.cache.forEach(it => {
              try {
                key = stableStringify(this.form[it])
                key += this.formList[ind].prop
              } catch (error) {
                console.warn(`依赖错误：${data.prop}`)
              }
            })
            if (this.cacheMapOptinon[key]) {
              this.$set(this.formList[ind], "selectList", this.cacheMapOptinon[key])
            } else {
              data[method](
                this.form[data.prop],
                this.form,
                this.formList,
                (this.$refs[refName] && this.$refs[refName][0]) || ""
              ).then(res => {
                this.cacheMapOptinon[key] = res
                this.$set(this.formList[ind], "selectList", res)
              })
            }
          }
        } else {
          data[method](
            this.form[data.prop],
            this.form,
            this.formList,
            (this.$refs[refName] && this.$refs[refName][0]) || ""
          )
        }
      }
      //自带过滤
      if (type == "input") {
        if (data.reg && typeof this.form[data.prop] === "string") {
          this.form[data.prop] = this.form[data.prop].replace(data.reg, "")
        }
      }
    }
  },
  mounted() {
    this.$refs.form.resetFields()
  }
}
</script>
<style lang="scss" scoped>
.form-component-container {
  width: 100%;
}
.form-component-buttons {
  margin-top: 4px;
  margin-bottom: 10px;
}
.slot {
  display: inline-block;
}
</style>
