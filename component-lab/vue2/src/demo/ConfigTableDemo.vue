<template>
  <div class="config-table-demo">
    <h2>ConfigTable 配置化表格组件</h2>

    <ConfigTable
      ref="table"
      :data="tableData"
      :columns="columns"
      :search-fields="searchFields"
      :total="total"
      :loading="loading"
      row-key="id"
      reserve-selection
      locked-key="locked"
      :selection-display-props="['code', 'name']"
      :default-selection="defaultSelection"
      search-button-loading
      show-filter-checkbox
      filter-checkbox-label="仅看可用"
      @search="handleSearch"
      @reset="handleReset"
      @search-change="handleSearchChange"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @select="logSelect"
      @row-click="handleRowClickDemo"
      @filter-checkbox-change="handleFilterCheckbox"
    >
      <template #toolbar>
        <el-button type="primary" size="small" @click="batchAction('批量操作')">批量操作</el-button>
        <el-button size="small" @click="showSelected">获取选中</el-button>
        <el-button size="small" @click="echoDisabledRow">程序化选中禁用行</el-button>
        <el-button size="small" @click="clearSelect">清空选中</el-button>
        <el-button size="small" @click="toggleRow2Disabled">切换第2行禁选</el-button>
        <el-button size="small" @click="echoSearchForm">模拟编辑回显</el-button>
      </template>

      <template #fieldSlot="{ form }">
        <el-input :value="form.customDemo" placeholder="自定义插槽控件" @input="v => $set(form, 'customDemo', v)" />
      </template>

      <template #statusCell="{ row }">
        <!-- 按钮权限独立于 _disabled：禁用选择行依然可以操作 -->
        <el-button type="text" size="mini" @click.stop="rowAction('编辑', row)">编辑</el-button>
        <el-button
          type="text"
          size="mini"
          class="danger-text"
          :disabled="!row.canDelete"
          @click.stop="rowAction('删除', row)"
        >
          删除
        </el-button>
      </template>

      <template #tagCell="{ row }">
        <el-tag v-if="row._disabled === true" size="mini" type="info">禁选</el-tag>
        <el-tag v-else-if="row.locked" size="mini" type="warning">锁定</el-tag>
        <el-tag v-else size="mini" type="success">可选</el-tag>
      </template>
    </ConfigTable>

    <p class="log">{{ log }}</p>
  </div>
</template>

<script>
import ConfigTable from '../components/ConfigTable/index.vue'

const allRows = Array.from({ length: 25 }, (_, i) => {
  const n = i + 1
  return {
    id: n,
    code: 'CODE-' + String(n).padStart(3, '0'),
    name: '数据项 ' + n,
    category: n % 2 === 0 ? 'B' : 'A',
    amount: n * 100,
    // 创建日期：2026-10-01 起逐日递增，供自定义区间 cusStart/cusEnd 过滤演示
    createdAt: '2026-10-' + String(n).padStart(2, '0'),
    canDelete: n % 5 !== 0,
    _disabled: n === 2 || n === 7 ? true : n === 3 ? false : undefined,
    locked: n === 4 || n === 9,
  }
})

// extraOptions 单位换算：万元 → 元，便于用同一 amount 字段过滤
const AMOUNT_UNIT_RATE = { yuan: 1, wan: 10000 }

export default {
  name: 'ConfigTableDemo',
  components: { ConfigTable },
  data() {
    return {
      loading: false,
      filterOnlyActive: false,
      total: 0,
      tableData: [],
      defaultSelection: [],
      log: '',
      columns: [
        { type: 'selection' },
        { type: 'index', label: '序号', width: 70 },
        {
          label: '基本信息',
          children: [
            { prop: 'code', label: '编码', minWidth: 110, sortable: true },
            { prop: 'name', label: '名称', minWidth: 140, showOverflowTooltip: true },
            { prop: 'category', label: '类别', width: 90 },
          ],
        },
        { prop: 'amount', label: '金额', width: 110, align: 'right', formatter: (row, col, val) => Number(val).toFixed(2) },
        { prop: 'tag', label: '状态', width: 90, slot: 'tagCell' },
        { prop: 'op', label: '操作', width: 140, slot: 'statusCell' },
      ],
      searchFields: [
        { prop: 'name', label: '名称', type: 'input', maxlength: 20 },
        { prop: 'category', label: '类别', type: 'select', multiple: true, checkAll: true, options: [
          { label: 'A 类', value: 'A' },
          { label: 'B 类', value: 'B' },
        ] },
        { prop: 'org', label: '组织', type: 'tree', multiple: true, treeData: [
          { value: 'o1', label: '总部', children: [
            { value: 'o11', label: '一部' },
            { value: 'o12', label: '二部' },
          ] },
          { value: 'o2', label: '分部' },
        ] },
        { prop: 'status', label: '状态', span: 16, type: 'select', defaultValue: '1', options: [
          { label: '启用', value: '1' },
          { label: '停用', value: '0' },
        ], customRange: { startProp: 'cusStart', endProp: 'cusEnd' } },
        { type: 'daterange', label: '创建日期', startProp: 'startDate', endProp: 'endDate' },
        // 金额区间：单位由 extraOptions 下拉切换（元/万元），值写入 extraProp；
        // 不再同时配置 unit，避免固定单位文字与可切换单位下拉语义重复。
        // span 16：三列栅格下内容区只有 237px，装不下「两个输入框 + 至 + 单位下拉」
        // 且不压缩输入框（120px 标签固定占用），故让该字段独占两列，
        // 单个输入框宽度与其余字段的输入框一致
        { type: 'double-input', label: '金额区间', span: 16, startProp: 'minAmount', endProp: 'maxAmount', startLimit: { min: 0 }, endLimit: { max: 10000 },
          extraProp: 'amountUnit', extraOptions: [{ label: '元', value: 'yuan' }, { label: '万元', value: 'wan' }] },
        { prop: 'codeInput', label: '编码关键字', type: 'unit-input', unit: '号', precision: 0 },
        { type: 'select-input', label: '类型关键字', startProp: 'type', endProp: 'keyword', options: [
          { label: '合同', value: 'ht' },
          { label: '订单', value: 'dd' },
        ] },
        { prop: 'dateLimit', label: '生效日期', type: 'date', disableFuture: true, maxSpanDays: 30 },
        // 固定单位的数字区间（不配置 extraOptions），对照“仅 unit”场景
        { type: 'double-input', label: '数量区间', startProp: 'minQty', endProp: 'maxQty', unit: '件', precision: 0 },
        { prop: 'remark', label: '备注', type: 'input' },
        { prop: 'owner', label: '负责人', type: 'tree', treeData: [
          { value: 'u1', label: '张三', children: [{ value: 'u11', label: '张三助理' }] },
          { value: 'u2', label: '李四' },
        ] },
        { prop: 'tipText', label: '提示', type: 'text', defaultValue: '静态展示文本' },
        { label: '自定义', slot: 'fieldSlot' },
      ],
    }
  },
  created() {
    this.fetch({ pageNum: 1, pageSize: 10 })
  },
  methods: {
    fetch(params) {
      this.loading = true
      setTimeout(() => {
        // params 即组件 search 事件载荷：含 searchForm 全部字段 + pageNum/pageSize
        const { pageNum = 1, pageSize = 10, name, category, minAmount, maxAmount, amountUnit, cusStart, cusEnd, minQty, maxQty } = params
        let list = allRows.slice()
        if (this.filterOnlyActive) list = list.filter(r => !r._disabled)
        if (name) list = list.filter(r => r.name.includes(name))
        if (category && category.length) list = list.filter(r => category.includes(r.category))
        // 金额区间按所选单位换算成“元”后过滤（yuan: 1、wan: 10000，默认 yuan）
        const rate = AMOUNT_UNIT_RATE[amountUnit] || 1
        if (minAmount != null && minAmount !== '') list = list.filter(r => r.amount >= Number(minAmount) * rate)
        if (maxAmount != null && maxAmount !== '') list = list.filter(r => r.amount <= Number(maxAmount) * rate)
        // 自定义区间日期过滤（启用后主控件值被禁用，以 cusStart/cusEnd 为准）
        if (cusStart) list = list.filter(r => r.createdAt >= cusStart)
        if (cusEnd) list = list.filter(r => r.createdAt <= cusEnd)
        if (minQty != null && minQty !== '') list = list.filter(r => r.id >= Number(minQty))
        if (maxQty != null && maxQty !== '') list = list.filter(r => r.id <= Number(maxQty))
        this.total = list.length
        this.tableData = list.slice((pageNum - 1) * pageSize, pageNum * pageSize)
        this.loading = false
      }, 200)
    },
    handleSearch(params) {
      this.log = 'search 事件: ' + JSON.stringify(params)
      this.fetch(params)
    },
    handleReset() {
      this.log = 'reset 事件（已恢复默认查询条件）'
    },
    handleSearchChange(value, field, form) {
      let extra = ''
      // 自定义区间：同时展示勾选态与 customRange.startProp/endProp 的实际值，便于观察启用/关闭/重开
      if (field.customRange) {
        const cr = field.customRange
        extra = '，' + cr.startProp + '=' + JSON.stringify(form[cr.startProp]) + '，' + cr.endProp + '=' + JSON.stringify(form[cr.endProp])
      }
      // double-input + extraOptions：展示区间值与单位，便于观察切换与回显
      if (field.type === 'double-input' && field.extraProp) {
        extra = '，' + field.startProp + '=' + JSON.stringify(form[field.startProp]) + '，' + field.endProp + '=' + JSON.stringify(form[field.endProp]) + '，' + field.extraProp + '=' + JSON.stringify(form[field.extraProp])
      }
      this.log = 'search-change 事件: ' + field.label + ' = ' + JSON.stringify(value) + extra
    },
    handleSelectionChange(selection) {
      this.log = 'selection-change: 已选 ' + selection.length + ' 项 → ' + selection.map(r => r.id).join(',')
    },
    logSelect(selection, row) {
      this.log = 'select 事件: 行 ' + (row && row.id) + '，当前选中 ' + selection.length + ' 项'
    },
    handleRowClickDemo(row) {
      this.log = 'row-click: ' + row.name + '（_disabled=' + row._disabled + ' 行点击依然触发）'
    },
    handleFilterCheckbox(val) {
      this.filterOnlyActive = val
      this.log = 'filter-checkbox-change: ' + val
    },
    handleSortChange({ prop, order }) {
      this.log = 'sort-change 事件: ' + prop + ' → ' + order
      if (!order) return
      const dir = order === 'ascending' ? 1 : -1
      this.tableData = this.tableData.slice().sort((a, b) => (a[prop] > b[prop] ? dir : -dir))
    },
    showSelected() {
      const rows = this.$refs.table.getSelectedRows()
      this.$message.success('getSelectedRows: ' + rows.map(r => r.name).join('、'))
    },
    echoDisabledRow() {
      // 程序化回显路径：允许选中 _disabled 行（仅复选框不可用户勾选）
      const target = allRows.find(r => r._disabled === true)
      const merged = this.$refs.table.getSelectedRows().concat([target])
      this.$refs.table.setSelection(merged)
      this.log = 'setSelection 程序化选中禁用行 id=' + target.id
    },
    clearSelect() {
      this.$refs.table.clearSelection()
    },
    toggleRow2Disabled() {
      const row = this.tableData.find(r => r.id === 2)
      if (!row) return
      this.$set(row, '_disabled', row._disabled !== true)
      this.log = '动态修改：id=2 行 _disabled → ' + row._disabled
    },
    // 模拟“打开编辑页回显已保存查询条件”：通过字段 defaultValue 回填后重置表单。
    // 覆盖 double-input 的区间值 + extraDefaultValue（万元）与 customRange.defaultValue（启用态日期区间）
    echoSearchForm() {
      const echo = {
        minAmount: '1', maxAmount: '2', amountUnit: 'wan',
        cusStart: '2026-10-08', cusEnd: '2026-10-18',
      }
      this.searchFields = this.searchFields.map(f => {
        if (f.type === 'double-input' && f.extraProp === 'amountUnit') {
          return { ...f, defaultValue: [echo.minAmount, echo.maxAmount], extraDefaultValue: echo.amountUnit }
        }
        if (f.customRange) {
          return { ...f, customRange: { ...f.customRange, defaultValue: [echo.cusStart, echo.cusEnd] } }
        }
        return f
      })
      this.$nextTick(() => {
        this.$refs.table.resetSearch()
        this.log = '回显：金额区间 1~2 万元、自定义区间 ' + echo.cusStart + ' ~ ' + echo.cusEnd + '（已启用）'
      })
    },
    batchAction(name) {
      const rows = this.$refs.table.getSelectedRows()
      this.$message(name + '：共 ' + rows.length + ' 项')
    },
    rowAction(name, row) {
      // 证明 _disabled 不影响行内按钮：禁用选择行同样可编辑/删除
      this.$message(name + ' ' + row.name + '（_disabled=' + row._disabled + '）')
    },
  },
}
</script>

<style lang="scss" scoped>
.config-table-demo {
  h2 {
    font-size: 1.1rem;
    margin-bottom: 8px;
  }
  .danger-text {
    color: #f56c6c;
  }
  .log {
    margin-top: 12px;
    padding: 8px;
    background: #f8f8f8;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
    word-break: break-all;
  }

  // 双输入区间：组件内 `.el-input` 作为 flex 项沿用自动最小尺寸（min-width:auto，
  // 由原生 input 的 size 撑出约 177px min-content），三列栅格下两个输入框的最小
  // 宽度之和已超过内容区，`flex-wrap: wrap` 于是把 90px 的单位下拉换到第二行。
  // 放开输入框最小宽度并禁止换行，空间不足时由两个输入框等比压缩。
  ::v-deep .config-table__double-input {
    flex-wrap: nowrap;

    > .el-input {
      min-width: 0;
    }

    .config-table__extra-select {
      // 76px 是「万元」文本加后缀箭头不被裁切的下限；有余量时仍按组件的 90px 展示
      flex: 0 1 90px;
      min-width: 76px;
    }
  }

  // 下拉 + 自定义区间（状态）：通用规则把 `.el-select` 撑成 100% 宽，而区间块是
  // 块级 flex，两者只能各占一行——字段即便独占两列也仍是两行。让内容区改为可换行的
  // 弹性行：下拉固定取宽、区间块吃掉剩余宽度，同一行排开；剩余不足时区间块整块回下一行。
  ::v-deep .el-form-item__content:has(> .config-table__custom-range) {
    display: flex;
    align-items: center;
    // 装不下时让区间块整块回到下一行独占全宽，而不是把日期编辑器挤窄
    flex-wrap: wrap;
    gap: 8px;

    // 内容区的 ::before/::after 是浮动时代的清浮动占位，在 flex 下会变成两个零宽
    // 匿名项、各占一个 gap（左右各 8px），使控件整体右移且右侧留白，与上下行不对齐
    &::before,
    &::after {
      display: none;
    }

    > .el-select {
      width: 160px;
      // 下拉文字可用宽 = 宽 - 左右内边距 - 后缀箭头（实测 160px 时余 88px）。
      // 空间不足时先压缩下拉到 145px（仍可完整显示占位「请选择状态」70px），
      // 再不够才由区间块换行
      flex: 0 1 160px;
      min-width: 145px;
    }

    > .config-table__custom-range {
      // 342px = 勾选 94 + 间距 8 + 日期编辑器 240，即单行所需下限：
      // 有余量时吃掉剩余宽度，不足时不参与压缩、直接换行
      flex: 1 0 342px;
    }
  }

  // 查询操作区：组件把它当作普通栅格列排在字段流之后，而 `el-row` 是浮动布局，
  // 因此展开态下字段占满最后一行时操作区会掉到下一行左侧，收起态下又与行内最高
  // 字段顶端对齐。改为弹性换行容器，操作区不参与栅格取宽，统一靠行尾、对齐行底。
  ::v-deep .config-table__search .el-row {
    display: flex;
    flex-wrap: wrap;
  }

  ::v-deep .config-table__search .el-row > .el-col {
    flex-shrink: 0;
  }

  ::v-deep .config-table__search .el-row > .el-col:last-child {
    width: auto;
    flex: 0 0 auto;
    margin-left: auto;
    align-self: flex-end;
  }
}
</style>
