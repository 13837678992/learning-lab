<template>
  <span v-if="component === 'text'">{{ currentValue }}</span>
  <div
    :is="currentView"
    v-else
    v-model="currentValue"
    v-bind="currentProps"
    v-on="$listeners"
  ></div>
</template>
<script>
import AutoSelect from './AutoSelect.vue'
import HDoubleInput from './HDoubleInput.vue'
import HUnitInput from './HUnitInput.vue'
import DatePicker from './DatePicker.vue'
import KSelectTree from './KSelectTree.vue'
import KSelectTreeBranch from './KSelectTreeBranch.vue'
export default {
  name: 'CurrentComponent',
  data() {
    return {
      currentView: null,
      currentProps: {},
      // 自己封装的组件需要在 componentList 中填写
      componentList: [
        'auto-select',
        'source-multi-auto-select',
        'k-check-radio',
        'k-select-tree',
        'h-unit-input',
        'h-double-input',
        'K-select-tree-branch',
      ],
    }
  },
  props: {
    value: [String, Number, Array, Boolean],
    component: String,
    componentNo: String,
  },
  inheritAttrs: false,
  components: {
    AutoSelect,
    HDoubleInput,
    HUnitInput,
    DatePicker,
    KSelectTree,
    KSelectTreeBranch,
  },
  computed: {
    currentValue: {
      get() {
        return this.value
      },
      set(val) {},
    },
  },
  created() {
    this.init()
  },
  watch: {
    $attrs: {
      deep: true,
      handler() {
        this.init()
      },
    },
  },
  methods: {
    init() {
      const component = this.component
      if (this.componentList.includes(component) && this.$attrs.dictName) {
        // dict 字典名称，filter过滤掉哪些字段，remain 展示哪些字段，multi 是否多选，url 接口地址, alias 别名， params 参数， list 数据源列表， filterable 是否支持搜索
        const dictObj = JSON.parse(JSON.stringify(this.$attrs.dictName))
        const {
          dict: dictName,
          multi,
          url: interFace,
          alias,
          params,
          list: dataSource,
          filterable,
        } = dictObj
        const selectProps = {
          dictName,
          multiple: multi ? !!Number(multi) : false,
          multClearable: multi ? !!Number(multi) : false,
          interFace,
          alias,
          params,
          dataSource,
          filterable,
        }
        this.currentProps = {
          ...{ component },
          ...this.$attrs,
          ...selectProps,
        }
      } else {
        this.currentProps = {
          ...{ component },
          ...this.$attrs,
        }
      }
      this.currentView = component
    },
    updateValue(e) {
      this.$emit('input', e)
      this.$emit('on-change', e)
    },
  },
}
</script>
