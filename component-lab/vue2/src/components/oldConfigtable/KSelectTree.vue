<template>
  <u-select
    v-model="selectValue"
    :multiple="showCheckbox"
    :labelKey="alias.label"
    :valueKey="alias.value"
    filterable
    showTitle
    @on-change="onChange"
  >
    <u-select-tree virtual :treeData="dataSource"></u-select-tree>
  </u-select>
</template>
<script>
export default {
  name: 'KSelectTree',

  mixins: [],

  components: {},

  props: {
    value: {
      // v-model绑定的值
      type: String | Array,
      required: true,
    },
    alias: {
      type: Object,
      default: () => ({ value: 'id', label: 'title' }),
    },
    dataSource: {
      type: Array,
      default: () => [],
    },
    showCheckbox: {
      type: Boolean,
      default: true,
    },
  },

  data() {
    return {
      selectValue: [],
    }
  },

  computed: {},

  watch: {
    value(newVal) {
      this.selectValue = newVal || []
    },
  },

  created() {},

  mounted() {},

  destroyed() {},

  methods: {
    onChange(selected) {
      this.$emit('input', selected)
      this.$emit('on-change', selected)
    },
    reset() {
      this.selectValue = []
      this.onChange(this.selectValue)
    },
  },
}
</script>
<style lang="less" scoped="scoped"></style>
