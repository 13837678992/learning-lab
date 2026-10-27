<template>
  <div class="h-datagrid">
    <div id="h-datagrid-toolbar" ref="gridToolbar">
      <div class="pull-right" style="margin-right: 8px">
        <slot name="rightToolbar"></slot>
      </div>
      <slot name="toolbar"></slot>
    </div>
    <!-- 简单表格 -->
    <div class="clearfix">
      <div class="h-table-box">
        <h-table
          :ref="selfAdaptTable"
          stripe
          :border="border"
          :data="tData"
          :columns="columns"
          :multiLevel="multiLevel"
          :loading="hTableLoading"
          :rowSelect="rowSelect"
          :height="autoHeight ? '' : height || tableHeight"
          :max-height="maxHeight"
          :showTitle="showTitle"
          :show-header="showHeader"
          :highlight-row="highlightRow"
          :dataCheckedProp="dataCheckedProp"
          :rowSelectOnly="rowSelectOnly"
          :row-class-name="rowClassName"
          @on-row-click="onRowClick"
          @on-selection-change="onSelectChange"
          @on-sort-change="onSortChange"
          @on-select-cancel="onSelectCancel"
          @on-select="onSelect"
          @on-select-all="onSelectAll"
          @on-row-dblclick="onRowDblClick"
          @on-current-change="onCurrentChange"
        >
          <template v-slot:nodata>
            <img class="bi-grid-no-data" src="@/assets/404@2x.png" alt="" srcset="" />
            <p>暂无数据</p>
          </template>
        </h-table>
      </div>
      <div class="h-table-pageView">
        <h-page
          v-if="isShowPage"
          ref="gridPage"
          :current="pageInfo.pageNo"
          :page-size="pageInfo.pageSize"
          :total="total"
          :show-total="showTotal"
          :show-elevator="showElevator"
          :show-sizer="showSizer"
          :pageSizeOpts="pageSizeOpts"
          :size="size"
          placement="top"
          @on-change="dataChange"
          @on-page-size-change="pageSizeChange"
        ></h-page>
      </div>
    </div>
    <!--    表格选中抽屉：-->
    <div
      v-if="reserveSelection && rowKey && selected.length && showDrawer"
      class="choose-handler"
      :style="{ top: chooseHandlerHeight + 'px' }"
    >
      <h-button type="text" @on-click="showProducts = true">
        当前已选{{ selected.length }}只
        <h-icon name="enter"></h-icon>
      </h-button>
      <h-drawer
        v-model="showProducts"
        width="250"
        :title="'selected.length' + selected.length"
        class-name="second-class-drawer"
        :styles="styles"
        @on-close="showProducts = false"
      >
        <template #header>
          当前已选
          <h-button v-if="showDrawerClearAll" type="text" class="remove-btn" @click="clearAll">
            清空
          </h-button>
        </template>
        <p v-for="(item, index) in selected" :key="item[rowKey] + index" class="choose-item">
          <span>
            <template v-for="code in showItem">
              {{ item[code] }}
            </template>
          </span>
          <span
            v-if="(disabledKey && !item[disabledKey]) || !disabledKey"
            class="bi-link biui-icon biui-icon-delete bi-color-gray"
            @click="handleCheckData(item)"
          ></span>
        </p>
      </h-drawer>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    selfAdaptTable: {
      type: String,
      default: 'selfTable',
    }, // table的ref
    tData: Array, // table数据
    columns: Array, // table表头
    multiLevel: Array, // 多级表头分组
    hasPage: {
      // 是否显示分页
      type: Boolean,
      default: true,
    },
    current: Number, // 当前页码
    pageSize: Number, // 每页条数
    total: Number, // 总条数
    rowSelect: {
      // 多选时是否支持行选中
      type: Boolean,
      default: true,
    },
    height: {
      // 表格支持外部传入高度
      type: Number | String,
      default: 0,
    },
    autoHeight: {
      // 表格高度不做处理，根据自身内容长度来展示
      type: Boolean,
      default: false,
    },
    maxHeight: {
      type: Number | String,
    },
    showTotal: {
      // 是否显示总数
      type: Boolean,
      default: true,
    },
    showHeader: {
      type: Boolean,
      default: true,
    }, // 是否显示表头
    showElevator: {
      // 显示电梯，快速切换到某一页
      type: Boolean,
      default: true,
    },
    showSizer: {
      // 显示分页，改变page-size
      type: Boolean,
      default: true,
    },
    hTableLoading: {
      // 表格的loading显示
      type: Boolean,
      default: false,
    },
    showTitle: {
      // 是否显示title
      type: Boolean,
      default: false,
    },
    pageSizeOpts: {
      type: Array,
      default: () => [10, 20, 50, 100],
    },
    size: String,
    highlightRow: {
      type: Boolean,
      default: true,
    },
    rowSelectOnly: {
      type: Boolean,
      default: false,
    },
    dataCheckedProp: {
      type: Boolean,
      default: true,
    },
    rowClassName: {
      // 行的 className 的回调方法，
      type: Function,
      default: () => {},
    },
    rowKey: {
      type: String,
      default: '',
    },
    reserveSelection: {
      // 是否记录历史已选数据
      type: Boolean,
      default: false,
    },
    showDrawer: {
      // 跨页选中时，是否展示已选数据
      type: Boolean,
      default: true,
    },
    showDrawerClearAll: {
      type: Boolean,
      default: false,
    },
    primarySelect: {
      // 开启保留历史值模式，默认选中的值
      type: Array,
      default: () => [],
    },
    showItem: Array, // 当前已选列表展示字段
    border: {
      type: Boolean,
      default: true,
    },
    disabledKey: {
      type: String,
    },
    singleSelectProduct: {
      type: Boolean,
      default: false,
    },
  },
  watch: {
    selected: {
      deep: true,
      immediate: true,
      handler(val) {
        if (val) {
          this.$emit('sendselected', val)
        }
      },
    },
    columns: {
      deep: true,
      immediate: true,
      handler(val) {
        if (val) {
          for (let i = 0; i < val.length; i++) {
            if (val[i].type === 'selection' || val.type === 'radio') {
              this.selectionColumn = val[i]
              return
            }
            this.selectionColumn = {}
          }
        }
      },
    },
    tData: {
      deep: true,
      immediate: true,
      handler(val) {
        if (val && val.length && this.reserveSelection && this.rowKey) {
          const vm = this
          vm.selected.forEach(item => {
            // 开启保留历史值模式，设置选中状态：
            const index = vm.$bi.getArrayItemByKey(vm.rowKey, item[vm.rowKey], val)
            if (index > -1) {
              vm.tData[index]._checked = true
              if (this.disabledKey && item[this.disabledKey]) {
                vm.tData[index]._disabled = true
              }
            }
          })
        }
      },
    },
    primarySelect: {
      deep: true,
      immediate: true,
      handler(val) {
        if (!this.$bi.isEmpty(val)) {
          this.selected = [...val]
          // 回显数据变化时，同步选中项
          if (this.singleSelectProduct) {
            this.onSelect(this.selected, this.selected[0])
          } else {
            this.onSelect(this.selected, {})
          }
          this.onSelectChange(this.selected, [])
        }
      },
    },
  },
  data() {
    return {
      isShowPage: this.hasPage,
      pageInfo: {
        pageNo: this.current || 1,
        pageSize: this.pageSize || 10,
      },
      tableHeight: '',
      selected: [], // 已选
      selectionColumn: {},
      selectedData: [],
      showProducts: false,
      styles: {
        height: 'calc(100% - 55px)',
        paddingBottom: '53px',
      },
      chooseHandlerHeight: 40,
      selectChangeRows: [],
      selectRows: [],
      selectCancelRows: [],
    }
  },
  methods: {
    // 清空
    clearAll(type) {
      // 点击查询按钮时，重置选中项
      if (type === 'searchClick') {
        this.selected = []
      }
      this.$emit('on-select-change', [])
      this.$emit('on-select', [])
      this.$emit('on-select-cancel', [])
      this.$refs[this.selfAdaptTable].selectAll(false)
    },
    // 取消选中
    handleCheckData(item) {
      if (this.$bi.isEmpty(item)) {
        return
      }
      const index = this.tData.findIndex(row => {
        return item[this.rowKey] === row[this.rowKey]
      })
      // 判断是否存在
      if (index !== -1) {
        this.$refs[this.selfAdaptTable].handleCheckData(index, false)
      }
      // 同步selected
      this.selected = this.selected.filter(val => {
        return item[this.rowKey] !== val[this.rowKey]
      })
      // 组件内同步
      if (!(this.reserveSelection && this.rowKey && this.selectionColumn.type === 'selection')) {
        this.$emit('on-select-change', this.selectChangeRows, index)
        this.$emit('on-select', this.selectRows, item)
        this.$emit('on-select-cancel', this.selectCancelRows, item)
      } else {
        this.$emit('on-select-change', this.selected, index)
        this.$emit('on-select', this.selected, item)
        this.$emit('on-select-cancel', this.selected, item)
      }
    },
    // 点击页码
    dataChange(i) {
      this.pageInfo.pageNo = i
      this.$emit('changeCurrent', i)
    },
    // 每页条数改变
    pageSizeChange(i) {
      this.pageInfo.pageSize = i
      this.$emit('changePageSize', i)
    },
    getOffset(el) {
      const box = el.getBoundingClientRect()
      return {
        top: box.top + window.pageYOffset - document.documentElement.clientTop,
        left: box.left + window.pageXOffset - document.documentElement.clientLeft,
      }
    },
    getTableHeight() {
      // 获取表格距离顶部的高度
      const offest = this.getOffset(document.getElementsByClassName('h-table-box')[0]).top
      // 获取分页以及相应的padding的高度总和
      const pageHeight =
        document.getElementsByClassName('h-table-pageView')[0].offsetHeight + 12 + 16
      this.tableHeight = document.body.clientHeight - offest - pageHeight
    },
    onRowClick(selection, index) {
      this.$emit('on-row-click', selection, index)
    },
    // 多选模式下选项发生变化
    onSelectChange(selection, selectInx) {
      if (!(this.reserveSelection && this.rowKey && this.selectionColumn.type === 'selection')) {
        this.selectChangeRows = selection
        this.$emit('on-select-change', selection, selectInx)
      } else {
        // 打开保留历史值开关&&指定行key&&类型为多选
        const vm = this
        vm.tData.forEach(item => {
          const index = vm.$bi.getArrayItemByKey(vm.rowKey, item[vm.rowKey], vm.selected)
          if (item._checked) {
            if (index === -1) {
              vm.selected.push(item)
            }
            if (this.singleSelectProduct) {
              vm.selected = [item]
            }
          } else {
            if (index !== -1) {
              vm.selected.splice(index, 1)
            }
          }
        })
        this.$emit('on-select-change', vm.selected, selectInx)
      }
    },
    onSortChange({ column, key, order }) {
      this.$emit('on-sort-change', column, key, order)
    },
    onSelectCancel(selection, row) {
      // this.$emit('on-select-cancel', selection, row);
      if (!(this.reserveSelection && this.rowKey && this.selectionColumn.type === 'selection')) {
        this.selectCancelRows = selection
        this.$emit('on-select-cancel', selection, row)
      } else {
        // 打开保留历史值开关&&指定行key&&类型为多选
        const vm = this
        vm.tData.forEach(item => {
          const index = vm.$bi.getArrayItemByKey(vm.rowKey, item[vm.rowKey], vm.selected)
          if (item._checked) {
            if (index === -1) {
              vm.selected.push(item)
            }
            if (this.singleSelectProduct) {
              vm.selected = [item]
            }
          } else {
            if (index !== -1) {
              vm.selected.splice(index, 1)
            }
          }
        })
        this.$emit('on-select-cancel', vm.selected, row)
      }
    },
    onSelect(selection, row) {
      // this.$emit('on-select', selection, row);
      if (!(this.reserveSelection && this.rowKey && this.selectionColumn.type === 'selection')) {
        this.selectRows = this.$lodash.cloneDeep(selection)
        this.$emit('on-select', selection, row)
      } else {
        // 打开保留历史值开关&&指定行key&&类型为多选
        const vm = this
        vm.tData.forEach(item => {
          const index = vm.$bi.getArrayItemByKey(vm.rowKey, item[vm.rowKey], vm.selected)
          if (item._checked) {
            if (index === -1) {
              vm.selected.push(item)
            }
            if (this.singleSelectProduct) {
              vm.selected = [item]
            }
          } else {
            if (index !== -1) {
              vm.selected.splice(index, 1)
            }
          }
        })
        this.$emit('on-select', vm.selected, row)
      }
    },
    onSelectAll(selection) {
      if (!(this.reserveSelection && this.rowKey && this.selectionColumn.type === 'selection')) {
        this.selectRows = selection
        this.$emit('on-select-all', selection)
      } else {
        // 打开保留历史值开关&&指定行key&&类型为多选
        const vm = this
        vm.tData.forEach(item => {
          const index = vm.$bi.getArrayItemByKey(vm.rowKey, item[vm.rowKey], vm.selected)
          if (item._checked) {
            if (index === -1) {
              vm.selected.push(item)
            }
          } else {
            if (index !== -1) {
              vm.selected.splice(index, 1)
            }
          }
        })
        this.$emit('on-select-all', vm.selected)
      }
    },
    onRowDblClick(row) {
      this.$emit('on-row-dblclick', row)
    },
    onCurrentChange(row) {
      this.$emit('on-current-change', row)
    },
  },
  mounted() {
    if (!this.height) {
      this.$nextTick(() => {
        this.getTableHeight()
      })
      window.addEventListener('resize', () => {
        this.getTableHeight()
      })
    }
    // console.log('searchForm');
    // 条件高度
    // this.chooseHandlerHeight = document.getElementById('searchForm')?.clientHeight + 16;
  },
}
</script>

<style lang="less" scoped>
.choose-handler {
  cursor: pointer;
  position: absolute;
  background: rgba(0, 0, 0, 0.65);
  border-radius: 4px;
  padding: 0;
  height: 32px;
  line-height: 32px;
  font-size: 14px;
  color: #fff;
  top: 36px;
  right: 0;
  z-index: 1;

  .h-btn-text {
    color: #ffffff;
  }
}

.choose-item {
  &:not(:last-child) {
    border-bottom: 1px solid #d9d9d9;
    padding-bottom: 2px;
    margin-bottom: 2px;
  }
}
/deep/ .clearfix {
  margin-top: 4px;
  .h-table-pageView {
    padding: 12px 0 0;
  }
}
</style>
