<template>
  <div class="h-unit-input">
    <h-input
      v-model.trim.number="inputValue"
      :specialDecimal="specialDecimal"
      specialFilter
      :maxlength="maxlength"
      placeholder="请输入"
    ></h-input>
    <div v-if="itemObj.dataDict" class="unit" style="padding-left: 4px">
      {{ itemObj.dataDict }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'HUnitInput',
  props: {
    value: [String, Number],
    itemObj: {
      // 单位
      type: Object,
      default: () => {},
    },
    maxlength: {
      type: Number,
      default: 99999,
    },
    specialDecimal: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      inputValue: this.value,
    }
  },
  watch: {
    value(n) {
      this.inputValue = n
    },
    inputValue(n) {
      this.$emit('on-change', n)
    },
  },
}
</script>

<style lang="less" scoped>
.h-unit-input {
  position: relative;
  .unit {
    position: absolute;
    line-height: 32px;
    right: 10px;
    top: 0;
  }
}
</style>
