<template>
  <h-date-picker
    v-model="dateValue"
    :format="format"
    showFormat
    transfer
    autoPlacement
    :type="type"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    :placement="placement"
    :options="optionsTemp"
    @on-select-range="changeDate"
    @on-change="changeDateValue"
  ></h-date-picker>
</template>
<script>
export default {
  name: 'DatePicker',
  data() {
    return {
      dateValue: this.value,
      tempStartDate: null,
      optionsTemp: null,
    }
  },
  created() {
    if (this.options && this.options.pickerMaxDays) {
      this.optionsTemp = {
        disabledDate: time => {
          // console.log(time)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (time > today) {
            return true
          }
          if (this.tempStartDate) {
            debugger
            const start = new Date(this.tempStartDate)
            start.setHours(0, 0, 0, 0)
            const minDate = new Date(start)
            const maxDate = new Date(start)
            minDate.setDate(start.getDate() - this.options.pickerMaxDays)
            maxDate.setDate(start.getDate() + this.options.pickerMaxDays)
            return time < minDate || time > maxDate
          }

          return false
        },
        ...this.options,
      }
    } else {
      this.optionsTemp = this.options
    }
  },
  props: {
    placeholder: {
      // 是否支持默认文字
      type: String,
      default: '请选择',
    },
    type: {
      type: String,
      default: 'date',
    },
    format: {
      type: String,
      default: 'yyyy-MM-dd',
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
    },
    placement: {
      type: String,
      default: 'bottom-start',
    },
    options: {
      type: Object,
      default: () => ({}),
    },
    value: {},
    defaultValue: {},
  },
  watch: {
    // value(val) {
    //   console.log('date----测试时间----', val);
    //   this.dateValue = val;
    // },
    defaultValue: {
      handler(newValue, oldValue) {
        if (this.type == 'daterange') {
          this.dateValue = this.defaultValue
        }
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    changeDateValue(val) {
      // this.dateValue = val;
      // this.$emit('input', val);
      this.$emit('on-change', val)
    },
    changeDate(time, flag) {
      console.log(time, flag, 'falg')
      if (!flag) {
        this.tempStartDate = time
      } else {
        this.tempStartDate = null
      }
    },
    clearVal() {
      this.dateValue = this.value || ''
    },
  },
  mounted() {
    // if (['daterange', 'datetimerange', 'monthrange'].includes(this.type)) {
    //   this.dateValue = this.value || [];
    // }
  },
}
</script>

<style lang="scss" scoped></style>
