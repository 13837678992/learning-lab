/**
 * ConfigTable 递归列渲染组件。
 * el-table 无 columns 配置 prop，用 render 函数将列配置映射为 el-table-column，
 * 支持多级表头（children）、作用域插槽透传（cellSlots[column.slot]）。
 */
const ConfigTableColumn = {
  name: 'ConfigTableColumn',
  props: {
    column: { type: Object, required: true },
    // ConfigTable 的 $scopedSlots，按 column.slot 名称取用
    cellSlots: { type: Object, default: () => ({}) },
    // 选择列可选性判断（_disabled 规则在 ConfigTable 内组合）
    selectable: { type: Function, default: null },
    reserveSelection: { type: Boolean, default: false },
    indexMethod: { type: Function, default: null },
  },
  render(h) {
    const col = this.column
    const props = {
      columnKey: col.prop,
      prop: col.prop,
      label: col.label,
      width: col.width,
      minWidth: col.minWidth,
      align: col.align,
      headerAlign: col.headerAlign,
      fixed: col.fixed,
      // 服务端排序：sortable 统一转为 'custom'，排序结果由调用方通过 sort-change 处理
      sortable: col.sortable ? 'custom' : false,
      sortBy: col.sortBy,
      resizable: col.resizable !== false,
      showOverflowTooltip: col.showOverflowTooltip,
      formatter: col.formatter,
      className: col.className,
      labelClassName: col.labelClassName,
      filters: col.filters,
      filterMultiple: col.filterMultiple !== false,
    }
    if (col.type === 'selection') {
      props.type = 'selection'
      props.selectable = this.selectable || undefined
      props.reserveSelection = this.reserveSelection
      props.width = col.width || 55
      props.align = col.align || 'center'
    } else if (col.type === 'index') {
      props.type = 'index'
      if (this.indexMethod) props.index = this.indexMethod
    } else if (col.type === 'expand') {
      props.type = 'expand'
    }
    const data = { props }
    const slotFn = col.slot && this.cellSlots[col.slot]
    if (slotFn) {
      data.scopedSlots = {
        default: scope =>
          slotFn({ row: scope.row, index: scope.$index, column: col }),
      }
    }
    const children = (col.children || []).map(child =>
      h(ConfigTableColumn, {
        key: child.prop || child.label,
        props: {
          column: child,
          cellSlots: this.cellSlots,
          selectable: this.selectable,
          reserveSelection: this.reserveSelection,
          indexMethod: this.indexMethod,
        },
      })
    )
    return h('el-table-column', data, children.length ? children : undefined)
  },
}

export default ConfigTableColumn
