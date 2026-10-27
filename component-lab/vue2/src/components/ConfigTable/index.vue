<template>
  <div class="config-table">
    <slot name="header" />

    <!-- 搜索表单区 -->
    <div v-if="searchFields.length" class="config-table__search">
      <el-form
        :model="form"
        :label-width="labelWidth"
        @submit.native.prevent
        @keyup.enter.native="search()"
      >
        <el-row :gutter="8">
          <el-col
            v-for="field in renderedFields"
            :key="field.prop || field.label"
            :span="fieldColumnSpan"
          >
            <el-form-item :label="field.label" :required="!!field.required">
              <!-- 自定义插槽控件 -->
              <slot v-if="field.slot" :name="field.slot" :field="field" :form="form" />

              <!-- 纯文本展示 -->
              <span v-else-if="field.type === 'text'" class="config-table__text">{{
                form[field.prop]
              }}</span>

              <!-- 输入框 -->
              <el-input
                v-else-if="!field.type || field.type === 'input'"
                :value="form[field.prop]"
                :placeholder="field.placeholder || '请输入' + (field.label || '')"
                :disabled="field.disabled"
                :maxlength="field.maxlength"
                :clearable="field.clearable !== false"
                @input="val => updateField(field.prop, val, field)"
              />

              <!-- 带单位数字输入 -->
              <el-input
                v-else-if="field.type === 'unit-input'"
                :value="form[field.prop]"
                :placeholder="field.placeholder || '请输入'"
                :disabled="field.disabled"
                :maxlength="field.maxlength"
                :clearable="field.clearable !== false"
                @input="val => updateNumberField(field.prop, val, field)"
              >
                <template v-if="field.unit" slot="suffix">
                  <span class="config-table__unit">{{ field.unit }}</span>
                </template>
              </el-input>

              <!-- 下拉选择（字典/静态数据源，props 注入 options） -->
              <el-select
                v-else-if="field.type === 'select'"
                :value="form[field.prop]"
                :multiple="!!field.multiple"
                :filterable="field.filterable !== false"
                :clearable="field.clearable !== false"
                :disabled="field.disabled || isCustomRangeChecked(field)"
                :collapse-tags="!!field.collapseTags"
                :placeholder="field.placeholder || '请选择' + (field.label || '')"
                @input="val => updateField(field.prop, val, field)"
              >
                <div v-if="field.multiple && field.checkAll" class="config-table__select-header">
                  <el-button type="text" size="mini" @click="selectAllOptions(field)">全选</el-button>
                  <el-button type="text" size="mini" @click="invertOptions(field)">反选</el-button>
                </div>
                <el-option
                  v-for="opt in field.options || []"
                  :key="String(opt.value)"
                  :label="opt.label"
                  :value="opt.value"
                  :disabled="opt.disabled"
                />
              </el-select>

              <!-- 下拉 + 输入组合（旧 auto-select isShowInput 模式：值写入 startProp/endProp） -->
              <div v-else-if="field.type === 'select-input'" class="config-table__select-input">
                <el-select
                  :value="form[field.startProp]"
                  :filterable="field.filterable !== false"
                  :clearable="field.clearable !== false"
                  :disabled="field.disabled"
                  :placeholder="field.placeholder || '请选择'"
                  @input="val => updateField(field.startProp, val, field)"
                >
                  <el-option
                    v-for="opt in field.options || []"
                    :key="String(opt.value)"
                    :label="opt.label"
                    :value="opt.value"
                    :disabled="opt.disabled"
                  />
                </el-select>
                <el-input
                  :value="form[field.endProp]"
                  placeholder="请输入"
                  :disabled="field.disabled"
                  :clearable="field.clearable !== false"
                  @input="val => updateField(field.endProp, val, field)"
                />
              </div>

              <!-- 树形下拉（值：nodeKey 或 nodeKey 数组） -->
              <el-select
                v-else-if="field.type === 'tree'"
                ref="treeSelect"
                :value="form[field.prop]"
                :multiple="!!field.multiple"
                :clearable="field.clearable !== false"
                :disabled="field.disabled"
                :placeholder="field.placeholder || '请选择' + (field.label || '')"
                :popper-append-to-body="false"
                @input="val => onTreeSelectInput(field, val)"
                @visible-change="visible => visible && syncTreeChecked(field)"
                @clear="updateField(field.prop, field.multiple ? [] : '', field)"
              >
                <el-option
                  v-for="node in flattenTreeNodes(field)"
                  v-if="field.multiple"
                  :key="'opt-' + String(node[treeConfig(field).value])"
                  class="config-table__tree-mapping-option"
                  :label="node[treeConfig(field).label]"
                  :value="node[treeConfig(field).value]"
                />
                <el-option
                  class="config-table__tree-option"
                  :disabled="!!field.multiple"
                  :label="treeDisplayLabel(field)"
                  :value="form[field.prop] === undefined ? '' : form[field.prop]"
                >
                  <el-tree
                    :ref="'tree-' + field.prop"
                    :data="field.treeData || []"
                    :props="treePropsOption(field)"
                    :node-key="treeConfig(field).value"
                    :show-checkbox="!!field.multiple"
                    :check-strictly="true"
                    highlight-current
                    :default-expand-all="field.expandAll !== false"
                    @node-click="node => onTreeNodeClick(field, node)"
                    @check="() => onTreeCheck(field)"
                  />
                </el-option>
              </el-select>

              <!-- 日期/日期时间/月份 单选 -->
              <el-date-picker
                v-else-if="field.type === 'date'"
                :value="form[field.prop]"
                :type="field.dateType || 'date'"
                :format="field.format || 'yyyy-MM-dd'"
                :value-format="field.valueFormat || defaultValueFormat(field.dateType)"
                :placeholder="field.placeholder || '请选择' + (field.label || '')"
                :disabled="field.disabled"
                :clearable="field.clearable !== false"
                :picker-options="buildPickerOptions(field)"
                @input="val => updateField(field.prop, val || '', field)"
              />

              <!-- 日期范围（值拆分写入 startProp/endProp） -->
              <el-date-picker
                v-else-if="field.type === 'daterange'"
                :value="rangeValue(field)"
                :type="field.dateType || 'daterange'"
                :format="field.format || defaultFormat(field.dateType)"
                :value-format="field.valueFormat || defaultValueFormat(field.dateType)"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                :disabled="field.disabled || isCustomRangeChecked(field)"
                :clearable="field.clearable !== false"
                :picker-options="buildPickerOptions(field)"
                @input="val => updateRangeField(field, val)"
              />

              <!-- 双输入范围（数字，值写入 startProp/endProp，可带单位下拉 extraProp） -->
              <div v-else-if="field.type === 'double-input'" class="config-table__double-input">
                <el-input
                  :value="form[field.startProp]"
                  placeholder="请输入"
                  :disabled="field.disabled"
                  :clearable="field.clearable !== false"
                  @input="val => updateRangeNumberField(field, 'startProp', val)"
                  @blur="clampRangeNumberField(field, 'startProp')"
                />
                <span class="config-table__range-sep">至</span>
                <el-input
                  :value="form[field.endProp]"
                  placeholder="请输入"
                  :disabled="field.disabled"
                  :clearable="field.clearable !== false"
                  @input="val => updateRangeNumberField(field, 'endProp', val)"
                  @blur="clampRangeNumberField(field, 'endProp')"
                />
                <span v-if="field.unit" class="config-table__unit config-table__unit--inline">{{
                  field.unit
                }}</span>
                <el-select
                  v-if="field.extraOptions"
                  :value="form[field.extraProp]"
                  class="config-table__extra-select"
                  :disabled="field.disabled"
                  @input="val => updateField(field.extraProp, val, field)"
                >
                  <el-option
                    v-for="opt in field.extraOptions"
                    :key="String(opt.value)"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>

              <!-- 选择控件后的自定义区间（checkbox + date，与主控件互斥） -->
              <div
                v-if="field.customRange"
                class="config-table__custom-range"
                :class="{ 'config-table__custom-range--inline': !isSelectLike(field) }"
              >
                <el-checkbox
                  v-model="customRangeChecked[fieldKey(field)]"
                  @change="onCustomRangeToggle(field)"
                >
                  自定义区间
                </el-checkbox>
                <el-date-picker
                  :value="customRangeValue(field)"
                  :type="field.customRange.dateType || 'daterange'"
                  :format="field.customRange.format || defaultFormat(field.customRange.dateType)"
                  :value-format="
                    field.customRange.valueFormat || defaultValueFormat(field.customRange.dateType)
                  "
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  :clearable="false"
                  :disabled="!isCustomRangeChecked(field)"
                  @input="val => updateCustomRange(field, val)"
                />
              </div>

              <!-- 字段附属插槽 -->
              <slot v-if="field.appendSlot" :name="field.appendSlot" :field="field" :form="form" />
            </el-form-item>
          </el-col>

          <el-col :span="buttonColumnSpan">
            <el-form-item label-width="0">
              <div class="config-table__buttons">
                <el-button
                  v-if="showSearchButton"
                  type="primary"
                  :loading="searchButtonLoading && loading"
                  :disabled="loading"
                  @click="handleSearchClick"
                >
                  查询
                </el-button>
                <el-button v-if="showResetButton" @click="resetSearch()">重置</el-button>
                <slot name="search-buttons" />
                <el-button
                  v-if="showMoreToggle"
                  type="text"
                  class="config-table__more-btn"
                  @click="collapsed = !collapsed"
                >
                  {{ collapsed ? '更多' : '收起' }}
                  <i :class="collapsed ? 'el-icon-arrow-down' : 'el-icon-arrow-up'" />
                </el-button>
                <el-checkbox
                  v-if="showFilterCheckbox"
                  v-model="filterCheckboxValue"
                  class="config-table__filter-checkbox"
                  @change="val => $emit('filter-checkbox-change', val)"
                >
                  {{ filterCheckboxLabel }}
                </el-checkbox>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 工具栏 -->
    <div class="config-table__toolbar">
      <div>
        <slot name="toolbar" />
      </div>
      <div class="config-table__toolbar-right">
        <el-popover
          v-if="showSelectedPanel"
          placement="bottom-end"
          width="280"
          trigger="click"
          popper-class="config-table__selected-popover"
        >
          <div class="config-table__selected-header">
            <span>当前已选 {{ selection.length }} 项</span>
            <el-button v-if="selectionPanelClearAll" type="text" size="mini" @click="clearSelection()">
              清空
            </el-button>
          </div>
          <div class="config-table__selected-list">
            <p v-for="(row, i) in selection" :key="selectionRowKey(row, i)" class="config-table__selected-item">
              <span>{{ selectionRowText(row) }}</span>
              <el-button
                v-if="!isRowLocked(row)"
                type="text"
                icon="el-icon-delete"
                class="config-table__selected-remove"
                @click="removeSelectedRow(row)"
              />
            </p>
          </div>
          <el-button slot="reference" type="text" class="config-table__selected-trigger">
            当前已选 {{ selection.length }} 项
            <i class="el-icon-arrow-down" />
          </el-button>
        </el-popover>
        <slot name="toolbar-right" />
      </div>
    </div>

    <!-- 数据表格 -->
    <div ref="tableBox" class="config-table__table">
      <el-table
        ref="table"
        v-loading="loading"
        :data="data"
        :row-key="rowKey || undefined"
        :height="computedHeight"
        :max-height="maxHeight"
        :border="border"
        :stripe="stripe"
        :size="size"
        :show-header="showHeader"
        :highlight-current-row="highlightCurrentRow"
        :row-class-name="rowClassName"
        @selection-change="handleSelectionChange"
        @select="handleSelect"
        @select-all="handleSelectAll"
        @row-click="handleRowClick"
        @row-dblclick="(row, column, event) => $emit('row-dblclick', row, column, event)"
        @current-change="row => $emit('current-change', row)"
        @sort-change="handleSortChange"
      >
        <config-table-column
          v-for="(col, i) in columns || []"
          :key="col.prop || col.label || i"
          :column="col"
          :cell-slots="$scopedSlots"
          :selectable="isRowSelectable"
          :reserve-selection="reserveSelection"
          :index-method="indexMethod"
        />
        <template slot="empty">
          <slot name="empty">
            <div class="config-table__empty">
              <i class="el-icon-document-delete" />
              <p>暂无数据</p>
            </div>
          </slot>
        </template>
      </el-table>
    </div>

    <!-- 分页 -->
    <div v-if="showPagination" class="config-table__pagination">
      <el-pagination
        background
        :current-page="pageNum"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :layout="pagerLayout"
        :total="total || 0"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
      />
    </div>
  </div>
</template>

<script>
import ConfigTableColumn from './TableColumn'

// 数字输入清洗：仅数字与一个小数点、不以点开头、小数位受限、负号可选
export function sanitizeNumeric(raw, precision = 2, allowNegative = false) {
  const s = raw == null ? '' : String(raw)
  const negative = allowNegative && s.trim().charAt(0) === '-'
  let v = s
    .replace(/[^\d.]/g, '')
    .replace('.', '$#$')
    .replace(/\./g, '')
    .replace('$#$', '.')
    .replace(/^\./g, '')
  if (precision <= 0) {
    v = v.replace(/\..*$/, '')
  } else {
    v = v.replace(new RegExp('^(\\d*\\.\\d{1,' + precision + '})\\d*$'), '$1')
  }
  return negative ? '-' + v : v
}

function clampValue(value, limit) {
  if (value === '' || value == null || !limit) return value
  const n = parseFloat(value)
  if (isNaN(n)) return value
  let out = n
  if (limit.min != null && out < Number(limit.min)) out = Number(limit.min)
  if (limit.max != null && out > Number(limit.max)) out = Number(limit.max)
  return String(out)
}

export default {
  name: 'ConfigTable',
  components: { ConfigTableColumn },
  props: {
    // ---- 数据与列 ----
    data: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    size: String,
    border: { type: Boolean, default: true },
    stripe: { type: Boolean, default: true },
    showHeader: { type: Boolean, default: true },
    highlightCurrentRow: { type: Boolean, default: false },
    rowClassName: { type: Function, default: undefined },
    height: { type: [String, Number], default: undefined },
    maxHeight: { type: [String, Number], default: undefined },
    // 表格高度自动填满视口剩余空间（默认关闭，由内容撑开）
    fitHeight: { type: Boolean, default: false },
    // ---- 行选择 ----
    rowKey: { type: String, default: '' },
    reserveSelection: { type: Boolean, default: false },
    // 额外的可选性条件（与 _disabled 规则取交集，仅影响用户勾选路径）
    selectable: { type: Function, default: null },
    rowClickSelect: { type: Boolean, default: true },
    singleSelection: { type: Boolean, default: false },
    // 默认选中行（程序化回显路径，可包含 _disabled 行）
    defaultSelection: { type: Array, default: () => [] },
    // ---- 已选面板（跨页选中辅助） ----
    showSelectionPanel: { type: Boolean, default: true },
    selectionPanelClearAll: { type: Boolean, default: false },
    selectionDisplayProps: { type: Array, default: () => [] },
    // 业务字段名：该字段为真值的已选行，在面板中不可移除（“选中且锁定”）
    lockedKey: { type: String, default: '' },
    // ---- 分页 ----
    showPagination: { type: Boolean, default: true },
    pageSizes: { type: Array, default: () => [10, 20, 50, 100] },
    pagerLayout: { type: String, default: 'total, sizes, prev, pager, next, jumper' },
    initialPage: { type: Number, default: 1 },
    initialPageSize: { type: Number, default: 10 },
    // ---- 搜索表单 ----
    searchFields: { type: Array, default: () => [] },
    searchColumns: { type: Number, default: 3 },
    labelWidth: { type: String, default: '120px' },
    showSearchButton: { type: Boolean, default: true },
    showResetButton: { type: Boolean, default: true },
    showMoreButton: { type: Boolean, default: true },
    searchButtonLoading: { type: Boolean, default: false },
    autoSearch: { type: Boolean, default: false },
    // searchFields 变化后是否自动触发查询：'never' | 'first' | 'always'
    searchOnFieldsChange: { type: String, default: 'never' },
    clearSelectionOnQuery: { type: Boolean, default: true },
    showFilterCheckbox: { type: Boolean, default: false },
    filterCheckboxLabel: { type: String, default: '' },
  },
  data() {
    return {
      form: {},
      selection: [],
      pageNum: this.initialPage,
      pageSize: this.initialPageSize,
      collapsed: true,
      customRangeChecked: {},
      rangePickStart: {},
      filterCheckboxValue: false,
      measuredHeight: undefined,
      fieldsChangedOnce: false,
    }
  },
  computed: {
    visibleFields() {
      return (this.searchFields || []).filter(f => !f.hidden)
    },
    moreThreshold() {
      return this.searchColumns * 2 - 1
    },
    showMoreToggle() {
      return this.showMoreButton && this.visibleFields.length > this.moreThreshold
    },
    renderedFields() {
      if (this.showMoreToggle && this.collapsed) {
        return this.visibleFields.slice(0, this.moreThreshold)
      }
      return this.visibleFields
    },
    fieldColumnSpan() {
      return Math.floor(24 / this.searchColumns)
    },
    buttonColumnSpan() {
      const rem = this.renderedFields.length % this.searchColumns
      const span = (rem === 0 ? this.searchColumns : this.searchColumns - rem) * this.fieldColumnSpan
      return span >= this.fieldColumnSpan ? span : this.fieldColumnSpan
    },
    hasSelectionColumn() {
      return (this.columns || []).some(c => c.type === 'selection')
    },
    computedHeight() {
      if (this.height === 'auto') return undefined
      if (this.height != null) return this.height
      return this.fitHeight ? this.measuredHeight : undefined
    },
    // 面板仅在开启跨页保留 + rowKey 且有选中项时展示（与旧组件一致）
    showSelectedPanel() {
      return (
        this.reserveSelection &&
        !!this.rowKey &&
        this.showSelectionPanel &&
        this.hasSelectionColumn &&
        this.selection.length > 0
      )
    },
  },
  watch: {
    searchFields: {
      handler() {
        this.applyFieldDefaults()
        if (this.searchOnFieldsChange === 'always') {
          this.$nextTick(() => this.search())
        } else if (
          this.searchOnFieldsChange === 'first' &&
          !this.fieldsChangedOnce
        ) {
          this.fieldsChangedOnce = true
          this.$nextTick(() => this.search())
        }
      },
    },
    form: {
      handler(n) {
        this.$emit('search-form-change', { ...n })
      },
      deep: true,
    },
    defaultSelection: {
      handler(n) {
        this.$nextTick(() => this.applyDefaultSelection(n))
      },
      deep: true,
    },
    data() {
      this.$nextTick(() => this.updateMeasuredHeight())
    },
  },
  created() {
    this.applyFieldDefaults()
  },
  mounted() {
    if (this.autoSearch) {
      this.search()
    }
    this.$nextTick(() => {
      this.applyDefaultSelection(this.defaultSelection)
      if (this.fitHeight) {
        this.updateMeasuredHeight()
        this._resizeHandler = () => this.updateMeasuredHeight()
        window.addEventListener('resize', this._resizeHandler)
      }
    })
  },
  beforeDestroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler)
      this._resizeHandler = null
    }
  },
  methods: {
    // ---------- 搜索表单 ----------
    fieldKey(field) {
      return field.prop || [field.startProp, field.endProp].join('-')
    },
    applyFieldDefaults() {
      this.visibleFields.forEach(field => {
        if (field.slot) return
        if (field.customRange && this.customRangeChecked[this.fieldKey(field)] === undefined) {
          this.$set(this.customRangeChecked, this.fieldKey(field), false)
        }
        const dv = field.defaultValue
        if (field.type === 'double-input' || field.type === 'select-input') {
          if (this.form[field.startProp] === undefined) {
            this.$set(this.form, field.startProp, (dv && dv[0]) ?? '')
          }
          if (this.form[field.endProp] === undefined) {
            this.$set(this.form, field.endProp, (dv && dv[1]) ?? '')
          }
          if (
            field.type === 'double-input' &&
            field.extraProp &&
            this.form[field.extraProp] === undefined
          ) {
            const first = (field.extraOptions || [])[0]
            this.$set(this.form, field.extraProp, field.extraDefaultValue ?? (first && first.value) ?? '')
          }
        } else if (field.type === 'daterange') {
          if (this.form[field.startProp] === undefined) {
            this.$set(this.form, field.startProp, (dv && dv[0]) ?? '')
          }
          if (this.form[field.endProp] === undefined) {
            this.$set(this.form, field.endProp, (dv && dv[1]) ?? '')
          }
        } else if (field.prop !== undefined && this.form[field.prop] === undefined) {
          this.$set(this.form, field.prop, dv !== undefined ? dv : field.multiple ? [] : '')
        }
      })
    },
    updateField(key, value, field) {
      if (key === undefined || key === null) return
      this.$set(this.form, key, value)
      if (field && field.resetProp && value !== '' && value != null) {
        this.$set(this.form, field.resetProp, '')
      }
      this.$emit('search-change', value, field, { ...this.form })
    },
    updateNumberField(key, value, field) {
      const v = sanitizeNumeric(value, field.precision === undefined ? 0 : field.precision, field.allowNegative)
      this.updateField(key, v, field)
    },
    updateRangeNumberField(field, side, value) {
      const precision = field.precision === undefined ? 2 : field.precision
      const v = sanitizeNumeric(value, precision, field.allowNegative)
      this.updateField(field[side], v, field)
    },
    clampRangeNumberField(field, side) {
      const limit = side === 'startProp' ? field.startLimit : field.endLimit
      const current = this.form[field[side]]
      const clamped = clampValue(current, limit)
      if (clamped !== current) {
        this.$set(this.form, field[side], clamped)
        this.$emit('search-change', clamped, field, { ...this.form })
      }
    },
    rangeValue(field) {
      const s = this.form[field.startProp]
      const e = this.form[field.endProp]
      return s || e ? [s, e] : null
    },
    updateRangeField(field, val) {
      this.$set(this.form, field.startProp, (val && val[0]) || '')
      this.$set(this.form, field.endProp, (val && val[1]) || '')
      this.$set(this.rangePickStart, this.fieldKey(field), '')
      this.$emit('search-change', val, field, { ...this.form })
    },
    defaultValueFormat(dateType) {
      if (dateType === 'datetime' || dateType === 'datetimerange') return 'yyyy-MM-dd HH:mm:ss'
      if (dateType === 'month' || dateType === 'monthrange') return 'yyyy-MM'
      return 'yyyy-MM-dd'
    },
    defaultFormat(dateType) {
      if (dateType === 'datetime' || dateType === 'datetimerange') return 'yyyy-MM-dd HH:mm:ss'
      if (dateType === 'month' || dateType === 'monthrange') return 'yyyy-MM'
      return 'yyyy-MM-dd'
    },
    buildPickerOptions(field) {
      const options = { ...(field.pickerOptions || {}) }
      const originDisabled = options.disabledDate
      const maxSpan = field.maxSpanDays
      const noFuture = field.disableFuture
      const key = this.fieldKey(field)
      options.onPick = ({ minDate, maxDate }) => {
        this.$set(this.rangePickStart, key, maxDate ? '' : minDate)
      }
      options.disabledDate = time => {
        if (noFuture) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (time.getTime() > today.getTime()) return true
        }
        const start = maxSpan && this.rangePickStart[key]
        if (start) {
          const min = new Date(start)
          const max = new Date(start)
          min.setDate(min.getDate() - maxSpan)
          max.setDate(max.getDate() + maxSpan)
          return time < min || time > max
        }
        return originDisabled ? originDisabled(time) : false
      }
      return options
    },
    isSelectLike(field) {
      return field.type === 'select' || field.type === 'tree'
    },
    isCustomRangeChecked(field) {
      return !!field.customRange && !!this.customRangeChecked[this.fieldKey(field)]
    },
    onCustomRangeToggle(field) {
      if (!this.isCustomRangeChecked(field)) {
        // 关闭自定义区间时清空其日期值，恢复主控件
        this.updateCustomRange(field, null)
      }
      this.$emit('search-change', this.customRangeChecked[this.fieldKey(field)], field, { ...this.form })
    },
    customRangeValue(field) {
      const cr = field.customRange
      if (!cr) return null
      const s = this.form[cr.startProp]
      const e = this.form[cr.endProp]
      return s || e ? [s, e] : null
    },
    updateCustomRange(field, val) {
      const cr = field.customRange
      this.$set(this.form, cr.startProp, (val && val[0]) || '')
      this.$set(this.form, cr.endProp, (val && val[1]) || '')
    },
    selectAllOptions(field) {
      const values = (field.options || [])
        .filter(o => !o.disabled)
        .map(o => o.value)
      this.updateField(field.prop, values, field)
    },
    invertOptions(field) {
      const all = (field.options || []).filter(o => !o.disabled).map(o => o.value)
      const current = this.form[field.prop] || []
      this.updateField(field.prop, all.filter(v => !current.includes(v)), field)
    },
    // ---------- 树形下拉 ----------
    treeConfig(field) {
      return { children: 'children', label: 'label', value: 'value', ...(field.treeProps || {}) }
    },
    treePropsOption(field) {
      const cfg = this.treeConfig(field)
      return { children: cfg.children, label: cfg.label }
    },
    flattenTreeNodes(field) {
      const cfg = this.treeConfig(field)
      const out = []
      const walk = list => {
        ;(list || []).forEach(node => {
          out.push(node)
          walk(node[cfg.children])
        })
      }
      walk(field.treeData)
      return out
    },
    treeDisplayLabel(field) {
      const value = this.form[field.prop]
      if (value === '' || value == null || (Array.isArray(value) && !value.length)) return ''
      const cfg = this.treeConfig(field)
      if (Array.isArray(value)) {
        return value
          .map(v => {
            const node = this.flattenTreeNodes(field).find(n => n[cfg.value] === v)
            return node ? node[cfg.label] : v
          })
          .join('、')
      }
      const node = this.flattenTreeNodes(field).find(n => n[cfg.value] === value)
      return node ? node[cfg.label] : value
    },
    onTreeNodeClick(field, node) {
      if (field.multiple) return
      const cfg = this.treeConfig(field)
      this.updateField(field.prop, node[cfg.value], field)
      this.closeTreeSelect()
    },
    onTreeSelectInput(field, val) {
      if (!field.multiple) return
      this.updateField(field.prop, val, field)
      this.$nextTick(() => this.syncTreeChecked(field))
    },
    onTreeCheck(field) {
      if (!field.multiple) return
      const tree = this.$refs['tree-' + field.prop]
      const treeRef = Array.isArray(tree) ? tree[0] : tree
      if (!treeRef) return
      // check-strictly 父子不联动：取全部勾选节点（含父节点），不能只取叶子
      const keys = treeRef.getCheckedKeys()
      this.updateField(field.prop, keys, field)
    },
    closeTreeSelect() {
      const all = this.$refs.treeSelect
      const list = Array.isArray(all) ? all : all ? [all] : []
      list.forEach(s => s && s.blur && s.blur())
    },
    syncTreeChecked(field) {
      if (!field.multiple) return
      const tree = this.$refs['tree-' + field.prop]
      const treeRef = Array.isArray(tree) ? tree[0] : tree
      if (!treeRef) return
      treeRef.setCheckedKeys(this.form[field.prop] || [])
    },
    // ---------- 表格与选择 ----------
    // _disabled 固定规则：仅布尔值 true 禁止通过选择列勾选；其余情况一律可选
    isRowSelectable(row, index) {
      if (row && row._disabled === true) return false
      return this.selectable ? this.selectable(row, index) !== false : true
    },
    rowIdentity(row) {
      return this.rowKey ? row[this.rowKey] : row
    },
    indexMethod(index) {
      return (this.pageNum - 1) * this.pageSize + index + 1
    },
    handleSelectionChange(selection) {
      this.selection = selection
      this.$emit('selection-change', selection)
    },
    handleSelect(selection, row) {
      if (this.singleSelection && row && selection.includes(row)) {
        selection
          .filter(r => r !== row)
          .forEach(r => this.$refs.table.toggleRowSelection(r, false))
      }
      this.$emit('select', this.singleSelection ? [row] : selection, row)
    },
    handleSelectAll(selection) {
      if (this.singleSelection && selection.length > 1) {
        selection
          .slice(1)
          .forEach(r => this.$refs.table.toggleRowSelection(r, false))
        this.$emit('select-all', [selection[0]])
        return
      }
      this.$emit('select-all', selection)
    },
    handleRowClick(row, column, event) {
      if (
        this.rowClickSelect &&
        this.hasSelectionColumn &&
        this.isRowSelectable(row)
      ) {
        const isSelected = this.selection.some(
          r => this.rowIdentity(r) === this.rowIdentity(row)
        )
        this.$refs.table.toggleRowSelection(row, !isSelected)
      }
      this.$emit('row-click', row, column, event)
    },
    handleSortChange({ column, prop, order }) {
      this.$emit('sort-change', { column, prop, order })
    },
    applyDefaultSelection(rows) {
      const table = this.$refs.table
      if (!table) return
      table.clearSelection()
      const list = this.singleSelection && rows && rows.length ? [rows[0]] : rows || []
      list.forEach(target => {
        if (!target) return
        const match = this.data.find(r => this.rowIdentity(r) === this.rowIdentity(target))
        table.toggleRowSelection(match || target, true)
      })
    },
    // ---------- 已选面板 ----------
    selectionRowKey(row, i) {
      return this.rowKey ? row[this.rowKey] : i
    },
    selectionRowText(row) {
      const props = this.selectionDisplayProps.length
        ? this.selectionDisplayProps
        : Object.keys(row).slice(0, 2)
      return props.map(p => row[p]).filter(v => v !== undefined && v !== null).join(' / ')
    },
    isRowLocked(row) {
      return !!this.lockedKey && row[this.lockedKey] === true
    },
    removeSelectedRow(row) {
      this.$refs.table.toggleRowSelection(row, false)
    },
    // ---------- 对外方法 ----------
    // 查询按钮：按 clearSelectionOnQuery 清空选中（与旧组件 searchClick 行为一致；翻页/回车不清）
    handleSearchClick() {
      if (this.clearSelectionOnQuery && this.hasSelectionColumn) {
        this.clearSelection()
      }
      this.search()
    },
    search() {
      this.$emit('search', this.getSearchParams())
    },
    resetSearch() {
      this.form = {}
      this.customRangeChecked = {}
      this.collapsed = true
      this.applyFieldDefaults()
      this.$emit('reset', { ...this.form })
    },
    getSearchParams() {
      const params = { ...this.form }
      if (this.showPagination) {
        params.pageNum = this.pageNum
        params.pageSize = this.pageSize
      }
      return params
    },
    getSelectedRows() {
      return this.selection
    },
    clearSelection() {
      if (this.$refs.table) this.$refs.table.clearSelection()
    },
    // 程序化选中（回显路径）：可包含 _disabled 行，整体替换当前选中
    setSelection(rows) {
      this.applyDefaultSelection(rows)
    },
    getTable() {
      return this.$refs.table
    },
    getSearchForm() {
      return { ...this.form }
    },
    // ---------- 分页 ----------
    handlePageChange(page) {
      this.pageNum = page
      this.search()
    },
    handlePageSizeChange(size) {
      this.pageSize = size
      this.pageNum = 1
      this.search()
    },
    // ---------- 高度自适应 ----------
    updateMeasuredHeight() {
      if (!this.fitHeight || !this.$refs.tableBox) return
      const rect = this.$refs.tableBox.getBoundingClientRect()
      const paginationEl = this.$el.querySelector('.config-table__pagination')
      const paginationHeight = paginationEl ? paginationEl.offsetHeight + 12 : 0
      const h = window.innerHeight - rect.top - paginationHeight - 32
      this.measuredHeight = h > 200 ? h : 200
    },
  },
}
</script>

<style lang="scss" scoped>
.config-table {
  padding: 16px;
  background: #fff;

  &__search {
    ::v-deep .el-form-item {
      margin-bottom: 12px;
      width: 100%;
    }
    ::v-deep .el-input,
    ::v-deep .el-select,
    ::v-deep .el-date-editor {
      width: 100%;
    }
  }

  &__buttons {
    text-align: right;
    white-space: nowrap;
  }

  &__more-btn {
    padding: 4px;
  }

  &__filter-checkbox {
    margin-left: 12px;
  }

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 32px;
    margin: 4px 0 8px;
  }

  &__toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__selected-trigger {
    padding: 4px 8px;
  }

  &__table {
    ::v-deep .el-table {
      width: 100%;
    }
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
  }

  &__text {
    display: inline-block;
    line-height: 32px;
  }

  &__unit {
    line-height: 32px;
    color: #909399;

    &--inline {
      padding-left: 4px;
    }
  }

  &__double-input {
    display: flex;
    align-items: center;
    gap: 4px;

    ::v-deep .el-input {
      flex: 1;
      width: auto;
    }
  }

  &__range-sep {
    padding: 0 2px;
    color: #606266;
  }

  &__extra-select {
    width: 90px;
    flex: none;
  }

  &__select-input {
    display: flex;
    gap: 5px;

    ::v-deep .el-select {
      flex: 1;
    }
    ::v-deep .el-input {
      flex: 1;
    }
  }

  &__custom-range {
    display: flex;
    align-items: center;
    gap: 8px;

    ::v-deep .el-date-editor {
      flex: 1;
    }

    &--inline {
      margin-top: 4px;
    }
  }

  &__select-header {
    padding: 4px 20px 4px;
    border-bottom: 1px solid #ebeef5;
  }

  &__empty {
    padding: 24px 0;
    color: #909399;

    i {
      font-size: 28px;
    }
    p {
      margin-top: 8px;
      font-size: 14px;
    }
  }
}

.config-table__tree-mapping-option {
  display: none;
}

.config-table__tree-option {
  height: auto;
  padding: 0;
  line-height: normal;

  ::v-deep .el-tree-node__content {
    height: 28px;
  }
}

.config-table__selected-popover {
  padding: 8px 12px;
}
</style>
