<template>
  <div class="h-double-input">
    <input
      v-model="value1"
      type="text"
      placeholder="请输入"
      class="h-input h-input-left"
      :class="{ disabled: disabled }"
      :disabled="disabled"
      @keyup="isFloor(...arguments, 'value1')"
      @blur="isFloor($event, 'value1', 'blur')"
    />
    <span class="mid-text">至</span>
    <input
      v-model="value2"
      type="text"
      placeholder="请输入"
      class="h-input h-input-left"
      :class="{ disabled: disabled }"
      :disabled="disabled"
      @keyup="isFloor(...arguments, 'value2')"
      @blur="isFloor($event, 'value2', 'blur')"
    />
    <span v-if="itemObj.unit" style="padding-left: 4px">
      {{ itemObj.unit }}
    </span>
    <auto-select
      v-if="isSelect"
      v-model="value3"
      style="padding-left: 8px"
      :clearable="false"
      :dataSource="selectList"
      :alias="doubleData.alias"
      :multiple="false"
      @on-change="changeDict"
    ></auto-select>
  </div>
</template>

<script>
import AutoSelect from './AutoSelect.vue'

export default {
  name: 'HDoubleInput',
  props: {
    doubleData: {
      type: Object,
      default: () => ({}),
    },
    isSelect: {
      // 是否显示下拉框
      type: Boolean,
      default: false,
    },
    selectList: {
      type: Array,
      default: () => {
        return []
      },
    },
    itemObj: {
      // 单位
      type: Object,
      default: () => {},
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    AutoSelect,
  },
  data() {
    return {
      value1: this.doubleData.value1,
      value2: this.doubleData.value2,
      value3: this.doubleData.value3,
    }
  },
  watch: {
    value1() {
      this.updateValue(arguments, 1)
    },
    value2() {
      this.updateValue(arguments, 2)
    },
    value3() {
      this.updateValue(arguments, 3)
    },
    doubleData(n) {
      this.value1 = n.value1
      this.value2 = n.value2
      this.value3 = n.value3
    },
  },
  created() {
    console.log('double', this.doubleData)
    // 选择框默认值
    if (this.$bi.isEmpty(this.doubleData.value3) && this.selectList.length) {
      this.value3 = this.selectList[0][this.doubleData.alias.value]
    }
  },
  methods: {
    updateValue(e, type) {
      const { value1, value2 } = this
      const data = { value1, value2 }
      // 前值
      data.value1 = this.value1
      // 后值
      data.value2 = this.value2
      // 下拉框
      data.value3 = this.value3
      this.$emit('on-change', data)
    },
    // 下拉框选择
    changeDict(value) {
      console.log(value)
    },
    isFloor(e, key, type) {
      console.log(e)
      const obj = e.target
      const t = obj.value.charAt(0)
      // 把第一个字符'.'替换成'$#$'
      // 把其余的字符'.'替换为空
      // 把字符'$#$'替换回原来的'.'
      // 只能输入数字和'.'
      // 不能以'.'开头
      // 只保留2位小数
      obj.value = obj.value
        .replace('.', '$#$')
        .replace(/\./g, '')
        .replace('$#$', '.')
        .replace(/[^\d.]/g, '')
        .replace(/^\./g, '')
        .replace(/([0-9]+\.[0-9]{2})[0-9]*/, '$1')
      if (parseInt(obj.value, 10) === parseFloat(obj.value) && !obj.value.includes('.')) {
        if (parseInt(obj.value, 10) === 0) {
          obj.value = 0
        } else {
          obj.value = obj.value.replace(/^0/, 0)
        }
      }
      // allowMinus是否允许负数
      if (t === '-' && this.itemObj.allowMinus) {
        obj.value = '-' + obj.value
      }
      if (type === 'blur') {
        try {
          const objKey = key === 'value1' ? 'beforeLimit' : 'afterLimit'
          if (
            this.itemObj[objKey] &&
            this.itemObj[objKey].min &&
            parseFloat(obj.value) < parseFloat(this.itemObj[objKey].min)
          ) {
            obj.value = parseFloat(this.itemObj[objKey].min)
          }
          if (
            this.itemObj[objKey] &&
            this.itemObj[objKey].max &&
            parseFloat(obj.value) > parseFloat(this.itemObj[objKey].max)
          ) {
            obj.value = parseFloat(this.itemObj[objKey].max)
          }
        } catch (err) {}
      }
      this[key] = obj.value
    },
  },
}
</script>

<style lang="scss" scoped>
.h-double-input {
  display: flex;
  .mid-text {
    width: 20px;
    padding: 0 4px;
  }
}
.disabled {
  background-color: #f7f7f7;
  opacity: 1;
  cursor: not-allowed;
  color: #999;
}
</style>
