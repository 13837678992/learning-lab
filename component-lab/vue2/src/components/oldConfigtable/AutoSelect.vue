<template>
  <div
    :class="[isShowCustomize ? 'auto-select__container' : '', inlineBlock ? 'inline-block' : '']"
  >
    <template v-if="!isShowInput">
      <h-select
        :value="selectValue"
        :multiple="multiple"
        :multipleNumber="multipleNumber"
        :placeholder="placeholder"
        :filterable="filterable"
        :clearable="clearable"
        :disabled="disabled"
        :isSelectFilter="isSelectFilter"
        :isCheckall="isCheckall"
        transfer
        autoPlacement
        @on-focus="getFocusData"
        @on-change="changeSelect"
      >
        <h-option
          v-for="item in dataList"
          :key="item[alias.value] + item[alias.label]"
          :value="item[alias.value]"
          :disabled="item.disabled"
        >
          {{ item[alias.label] }}
        </h-option>
      </h-select>
      <div v-if="isShowCustomize" class="customize-container">
        <h-checkbox v-model="checkedCustomize">自定义区间</h-checkbox>
        <h-date-picker
          v-model="dateValue"
          :format="customize.format"
          showFormat
          :type="customize.type"
          :placeholder="customize.placeholder"
          :disabled="customize.disabled"
          @on-change="dateChange"
        >
        </h-date-picker>
      </div>
    </template>
    <template v-else>
      <div class="select-input_container">
        <h-select
          v-model="value1"
          :multiple="multiple"
          :placeholder="placeholder"
          :filterable="filterable"
          :clearable="clearable"
          :disabled="disabled"
          :isSelectFilter="isSelectFilter"
          :isCheckall="isCheckall"
          transfer
          @on-focus="getFocusData"
          @on-change="changeSelect"
        >
          <h-option
            v-for="item in dataList"
            :key="item[alias.value] + item[alias.label]"
            :value="item[alias.value]"
            :disabled="item.disabled"
          >
            {{ item[alias.label] }}
          </h-option>
        </h-select>
        <h-input v-model="value2" clearable placeholder="请输入..."></h-input>
      </div>
    </template>
  </div>
</template>
<script>
export default {
  name: 'AutoSelect',
  data() {
    return {
      selectValue: this.value,
      value1: this.selectInputData.value1,
      value2: this.selectInputData.value2,
      dataList: [],
      checkedCustomize: false, // 自定义区间是否开启
      dateValue: [],
    }
  },
  props: {
    multipleNumber: {
      type: Number,
      default: 9999999999,
    },
    clearable: {
      // 是否可以清空选项，只在单选时有效
      type: Boolean,
      default: true,
    },
    value: {
      // v-model 双向绑定数据。
      type: [String, Number, Array, Boolean, Object],
    },
    selectInputData: {
      type: Object,
      default: () => ({}),
    },
    dataSource: {
      type: Array,
      default: () => [],
    },
    dictName: {
      type: String,
      default: '',
    },
    dictParams: {
      type: Object,
      default: () => {
        return {}
      },
    },
    alias: {
      type: Object,
      default() {
        return { value: 'value', label: 'label' }
      },
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      // 是否支持默认文字
      type: String,
      default: '请选择',
    },
    multiple: {
      // 是否支持多选
      type: Boolean,
      default: true,
    },
    filterable: {
      // 是否支持搜索
      type: Boolean,
      default: true,
    },
    isSelectFilter: {
      // 全选时是否全选过滤后的数据
      type: Boolean,
      default: true,
    },
    isCheckall: {
      // 是否显示全选反选快捷方式
      type: Boolean,
      default: true,
    },
    isShowCustomize: {
      // 规划列表-自定义区间
      type: Boolean,
      default: false,
    },
    isShowInput: {
      // 客户列表-证件类型选择后面的输入框
      type: Boolean,
      default: false,
    },
    customize: {
      type: Object,
      default: () => ({}),
    },
    inlineBlock: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    selectInputData(newVal) {
      this.value1 = newVal.value1
      this.value2 = newVal.value2
    },
    value(newVal) {
      // 判断是否多选，以及默认值不是数组
      if (this.multiple && !Array.isArray(newVal)) {
        this.selectValue = []
      } else {
        this.selectValue = newVal
      }
    },
    value1() {
      this.updateValue(arguments, 1)
    },
    value2() {
      this.updateValue(arguments, 2)
    },
    dataSource: {
      handler(newVal) {
        this.dataList = newVal
      },
      deep: true,
    },
    selectValue(newVal, oldVal) {
      if (newVal && this.dataList.length == 0) {
        this.getInterfaceData()
      }
      this.$emit('input', this.selectValue)
      this.$emit('on-change', this.selectValue)
    },
    checkedCustomize(newVal) {
      const obj = JSON.parse(JSON.stringify(this.$attrs.itemObj))
      obj.disabled = newVal
      obj.customize.disabled = !newVal
      this.$emit('changeSearchFormDom', this.$attrs.itemObj.element_code, obj)
    },
    dictParams(newVal, oldVal) {
      if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
        this.getInterfaceData()
      }
    },
  },
  methods: {
    updateValue(e, type) {
      const { value1, value2 } = this
      const data = { value1, value2 }
      // 前值
      if (type === 1) {
        data.value1 = this.value1
      }
      // 后值
      if (type === 2) {
        data.value2 = this.value2
      }
      // this.$emit('input', data);
      this.$emit('on-change', data)
    },
    dateChange(newVal) {
      const obj = {}
      obj[this.$attrs.itemObj.customize.before] = (newVal && newVal[0]) || ''
      obj[this.$attrs.itemObj.customize.after] = (newVal && newVal[1]) || ''
      this.$emit('changeSearchForm', obj)
    },
    // 切换选择项
    changeSelect(newVal) {
      if (!this.isShowInput) {
        this.selectValue = newVal
      } else {
        this.value1 = newVal
      }
    },
    getInterfaceData() {
      // dictParams
      const { dictName, interFace, dataSource } = this
      // console.log(dictParams);
      // 如果没有字典名称，也没有接口名称
      if (!dictName && !interFace && dataSource.length === 0) {
        // console.log('请绑定字典名称或接口url或数据集');
        return false
      }
      // 如果有数据集
      if (dataSource.length !== 0) {
        this.dataList = dataSource
        return false
      }
      // 如果有字典名称
      if (dictName) {
        this.$api.comControllerParams({ paramTypes: dictName }).then(({ data }) => {
          if (data) {
            this.dataList = data
            this.$emit('on-init', this.dataList)
          }
        })
        return false
      }
    },
    getFocusData() {
      // if(this.dataList.length > 0){
      //   return
      // }else{
      //   if (!this.standUp) {
      //     console.log('enter mounted')
      //     this.getInterfaceData()
      //   }
      // }
    },
  },
  mounted() {
    if (this.multiple) {
      this.selectValue = this.value || []
    }
    // if(this.value == '' && this.dataList.length == 0){
    this.getInterfaceData()
    // }
  },
}
</script>

<style lang="scss" scoped>
.auto-select__container {
  display: flex;
  .h-select {
    width: 40%;
  }
}
.customize-container {
  display: flex;
  flex: 1;
  align-items: center;
  .h-checkbox-wrapper {
    width: 33%;
  }
}
.h-select-single {
  user-select: none;
}
.select-input_container {
  display: flex;
  .h-select {
    width: 50%;
    margin-right: 5px;
  }
  .h-input-wrapper {
    width: 50%;
  }
}
</style>
