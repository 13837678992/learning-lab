<template>
  <div class="layout">
    <slot name="topContent" />
    <h-row name="flex" class="layout-menu-wrapper bi-form-b-fill">
      <h-col span="24" class="layout-menu-box">
        <div v-if="isRefash" id="searchForm">
          <h-form
            ref="searchForm"
            :model="searchForm"
            :label-width="120"
            :cols="searchCols"
          >
            <h-form-item
              v-for="item in displayCondition"
              :key="item.element_code"
              :label="item.element_name"
              :labelTitle="item.element_name"
              :prop="item.element_code"
              :cols="item.formItemCol"
              :required="item.requiredFlag === '1'"
            >
              <!-- <template #label>
                <div style="height: 32px">
                  <h-tooltip
                    v-if="item.element_name.length > 8"
                    :content="item.element_name"
                    placement="bottom-start"
                  >
                    <div class="label-desc">{{ item.element_name }}</div>
                  </h-tooltip>
                  <div
                    v-else
                    style="width: 120px"
                    class="h-form-item-label label-desc"
                  >
                    {{ item.element_name }}
                  </div>
                </div>
              </template> -->
              <!-- 自定义表单内容 -->
              <slot v-if="item.slot" :name="item.slotName" />
              <current-component
                v-else
                :ref="item.element_code || item.before"
                v-model="searchForm[item.element_code]"
                v-bind="{
                  clearable: item.clearable === void 0 || item.clearable,
                }"
                :isSelect="item.isSelect"
                :selectList="item.selectList"
                :dictParams="item.dictParams"
                :placeholder="item.placeholder"
                :filterRE="item.filterRE"
                :component="item.component"
                :disabled="item.disabled"
                :maxlength="item.maxlength"
                :dictName="item.data_dict"
                :type="item.type"
                :format="item.format"
                :options="item.options"
                :defaultValue="item.defaultValue"
                :doubleData="{
                  value1: searchForm[item.before],
                  value2: searchForm[item.after],
                  value3: searchForm[item.third],
                  alias: item.alias,
                }"
                :selectInputData="{
                  value1: searchForm[item.before],
                  value2: searchForm[item.after],
                }"
                :isShowCustomize="item.isShowCustomize"
                :isShowInput="item.isShowInput"
                :customize="item.customize"
                :itemObj="item"
                @on-change="searchChange(arguments, item)"
                @on-clear="searchChange(arguments, item, item.component_kind)"
                @keyup.enter.native="formSearch"
                @changeSearchForm="changeSearchForm"
                @changeSearchFormDom="changeSearchFormDom"
              />
              <!-- 自定义表单额外内容 -->
              <slot v-if="!item.slot && item.slotName" :name="item.slotName" />
            </h-form-item>
            <h-form-item :cols="buttomsCol" class="bi-btn-r-0">
              <div class="operation-btn">
                <h-button
                  v-if="!hiddenSearch && !loading"
                  type="primary"
                  @click="searchClick"
                  :disabled="hTableLoading"
                >
                  查询
                </h-button>
                <h-button
                  v-if="!hiddenSearch && loading"
                  :loading="hTableLoading"
                  type="primary"
                  @click="searchClick"
                  :disabled="hTableLoading"
                >
                  查询
                </h-button>
                <h-button
                  v-if="!hiddenReset"
                  type="ghost"
                  @click="formSearchReset"
                >
                  重置
                </h-button>
                <slot name="formButton" />
                <!--是否展示更多按钮，默认条件是-->
                <h-button
                  v-if="showMore && searchCondition.length > searchCols * 2 - 1"
                  class="more-btn bi-color-primary"
                  type="text"
                  @click="ifShowMore = !ifShowMore"
                >
                  更多
                  <i
                    class="iconfont"
                    :class="[
                      ifShowMore ? 'icon-t-b-down' : 'icon-ios-arrow-up',
                    ]"
                  ></i>
                </h-button>
                <h-checkbox v-if="isShowCheckBox" @on-change="checkBoxChange">
                  {{ showCheckBoxName }}
                </h-checkbox>
              </div>
            </h-form-item>
          </h-form>
        </div>
      </h-col>
    </h-row>
    <!--数据展示表格-->
    <div class="layout-main">
      <h-datagrid
        ref="datagrid"
        :hasPage="hasPage"
        :selfAdaptTable="tableRef"
        :tData="tData"
        :columns="columns"
        :multiLevel="multiLevel"
        :total="total"
        :current="current"
        :pageSize="pageSize"
        :rowSelect="rowSelect"
        :highlightRow="highlightRow"
        :height="height"
        :autoHeight="autoHeight"
        :hTableLoading="hTableLoading"
        :showTitle="showTitle"
        :dataCheckedProp="dataCheckedProp"
        :rowClassName="rowClassName"
        :reserveSelection="reserveSelection"
        :showDrawer="showDrawer"
        :showDrawerClearAll="showDrawerClearAll"
        :rowKey="rowKey"
        :disabledKey="disabledKey"
        :primarySelect="primarySelect"
        :showItem="showItem"
        :size="size"
        :rowSelectOnly="rowSelectOnly"
        :singleSelectProduct="singleSelectProduct"
        @changeCurrent="changeCurrent"
        @changePageSize="changePageSize"
        @on-row-click="onRowClick"
        @on-select-change="onSelectChange"
        @on-sort-change="onSortChange"
        @on-select-cancel="onSelectCancel"
        @on-select="onSelect"
        @on-select-all="onSelectAll"
        @sendselected="sendselected"
      >
        <template #toolbar>
          <div class="bi-btn-b">
            <slot name="btnBar" />
          </div>
        </template>
      </h-datagrid>
    </div>
  </div>
</template>

<script>
import CurrentComponent from './CurrentComponent';
import HDatagrid from './HDatagrid.vue';

export default {
  name: 'KConfigTable',
  data() {
    return {
      ifShowMore: true, // 组件内控制是否展示更多的查询表单（记录‘更多’按钮状态）
      searchForm: {},
      searchFormDom: this.conditions || [],
      current: 1,
      pageSize: 10,
      selectionList: [],
      isRefash: true, // 强制刷新
      conditionsChangeNum: 1,
    };
  },
  components: {
    // HPanel,
    CurrentComponent,
    HDatagrid,
  },
  props: {
    showMore: {
      // 外部传入，是否需要"展示更多"
      type: Boolean,
      default: true,
    },
    size: String,
    searchCols: {
      type: Number,
      default: 3,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    tableRef: {
      // table的ref
      type: String,
      default: 'selfTable',
    },
    searchFormRef: {
      // 搜索表单的ref
      type: String,
      default: 'searchForm',
    },
    conditions: {
      type: Array,
      default: () => [],
    },
    hasPage: {
      // 是否显示分页
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
    dataCheckedProp: {
      // 是否可以设置回显
      type: Boolean,
      default: true,
    },
    rowSelect: {
      // 多选时是否支持行选中
      type: Boolean,
      default: true,
    },
    highlightRow: {
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
    tData: Array, // 表格数据
    columns: Array, // 表格表头
    multiLevel: Array, // 多级表头分组
    total: Number, // 表格总数
    autoLoad: {
      // 是否自动加载表格
      type: Boolean,
      default: false,
    },
    hiddenSearch: {
      // 是否隐藏查询按钮
      type: Boolean,
      default: false,
    },
    hiddenReset: {
      // 是否隐藏重置按钮
      type: Boolean,
      default: false,
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
    rowSelectOnly: {
      type: Boolean,
      default: false,
    },
    reserveSelection: {
      // 是否记录历史已选数据
      type: Boolean,
      default: false,
    },
    showDrawer: {
      // 跨页选中时是否展示已选数据
      type: Boolean,
      default: true,
    },
    showDrawerClearAll: {
      type: Boolean,
      default: false,
    },
    queryClearSelect: {
      type: Boolean,
      default: true,
    },
    primarySelect: Array,
    showItem: Array, // 当前已选列表展示字段
    isShowCheckBox: {
      // 是否显示checkbox按钮
      type: Boolean,
      default: false,
    },
    showCheckBoxName: {
      // 显示checkbox按钮名称
      type: String,
      default: '',
    },
    showCheckBox: {
      // 树形下拉框多选
      type: Boolean,
      default: true,
    },
    conditionsFlag: {
      // 是否有筛选条件，通过这个参数控制自动发接口时机
      type: Boolean,
      default: false,
    },
    conditionsOnlyFirstFlag: {
      // 是否仅第一次筛选条件变更时，自动发接口
      type: Boolean,
      default: false,
    },
    disabledKey: {
      type: String,
    },
    singleSelectProduct: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    searchCondition() {
      if (
        !this.conditionsOnlyFirstFlag ||
        (this.conditionsOnlyFirstFlag && this.conditionsChangeNum <= 1)
      ) {
        this.conditionDefaultValue();
      }
      // 过滤后的查询条件(外部传入visable控制隐藏的字段)
      // 存在visable属性且为true 或者不存在visable属性时展示
      return this.conditions.filter(
        (v) =>
          (v.hasOwnProperty('visable') && v.visable) ||
          !v.hasOwnProperty('visable')
      );
    },
    displayCondition() {
      // 最终展示的查询条件（searchCondition变量设置“更多”）
      this.searchCondition.forEach((item) => {
        if (['proIssuer', 'supplierName'].indexOf(item.element_code) !== -1) {
          item.maxlength = 20;
        } else {
          if (this.$bi.isEmpty(item.maxlength)) {
            item.maxlength = 9999;
          }
        }
      });
      if (this.showMore && this.ifShowMore) {
        return this.searchCondition.slice(0, this.searchItemLength);
      } else {
        return this.searchCondition;
      }
    },
    searchItemLength() {
      // 可展示的查询条件个数
      const sum = this.searchCols * 2;
      if (!this.hiddenSearch || !this.hiddenReset || this.showMore) {
        // 只要按钮组有一个按钮，就需要长度-1
        return sum - 1;
      } else {
        return sum;
      }
    },
    buttomsCol() {
      // 操作栏按钮所占的col数量
      const remaind = this.searchCondition.length % this.searchCols;
      if (
        this.showMore &&
        this.ifShowMore &&
        this.searchCondition.length >= this.searchCols * 2
      ) {
        return 1;
      } else {
        return remaind === 0 ? this.searchCols : this.searchCols - remaind;
      }
    },
  },
  watch: {
    conditions(n, o) {
      this.$set(this, 'searchFormDom', n);
      // 重置查询条件
      if (
        this.autoLoad &&
        this.conditionsFlag &&
        (!this.conditionsOnlyFirstFlag ||
          (this.conditionsOnlyFirstFlag && this.conditionsChangeNum <= 1))
      ) {
        this.searchForm = {};
        this.$nextTick(() => {
          if (this.conditionsOnlyFirstFlag) {
            this.conditionsChangeNum += 2;
          }
          this.formSearch();
        });
      }
    },
    searchForm: {
      handler(n, o) {
        this.$emit('searchFormData', n || {}, o);
      },
      deep: true,
    },
  },
  created() {
    this.searchFormDom = this.conditions || [];
    this.conditionDefaultValue();
  },
  mounted() {
    if (this.autoLoad && !this.conditionsFlag) {
      this.formSearch();
    }
  },
  destroyed() {},
  methods: {
    //获取子组件
    getTableRef() {
      return this.$refs.datagrid;
    },
    // 设置默认值
    conditionDefaultValue() {
      const condList = this.conditions.filter(
        (v) =>
          (v.hasOwnProperty('visable') && v.visable) ||
          !v.hasOwnProperty('visable')
      );
      condList.forEach((cond) => {
        // 范围选择
        if (['8', '9'].indexOf(cond.componentKind) !== -1) {
          const doubleData = cond.doubleData || {};
          if (cond.componentKind === '8') {
            this.$set(this.searchForm, cond.before, doubleData.value1);
            this.$set(this.searchForm, cond.after, doubleData.value2);
            this.$set(this.searchForm, cond.third, doubleData.value3);
          } else {
            this.$set(this.searchForm, cond.before, doubleData.value1);
            this.$set(this.searchForm, cond.after, doubleData.value2);
          }
        } else {
          // 判断是否存在默认值
          if (!this.$bi.isEmpty(cond.defaultValue)) {
            // 基础类型
            this.$set(this.searchForm, cond.element_code, cond.defaultValue);
          }
        }
      });
      this.$forceUpdate();
    },
    changeSearchForm(obj) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.searchForm[key] = obj[key];
        }
      }
    },
    changeSearchFormDom(element_code, obj) {
      const index = this.searchFormDom.findIndex(
        (item) => item.element_code === element_code
      );
      this.searchFormDom[index] = obj;
      this.$forceUpdate();
    },
    // 搜索框展开/收起的时候表单自适应
    handleResize() {
      this.$nextTick(() => {
        if (!this.$refs.datagrid) {
          return false;
        }
        this.$refs.datagrid.selfAdaption();
      });
    },
    // 搜索条件变化时触发
    searchChange([data], element, kind) {
      const {
        element_code,
        component,
        before,
        after,
        third,
        type,
        resetField,
      } = element;
      // 两个input的情况
      if (component === 'h-double-input') {
        this.searchForm[before] = data.value1;
        this.searchForm[after] = data.value2;
        // 范围选择 + 下拉框
        if (!this.$bi.isEmpty(third)) {
          this.searchForm[third] = data.value3;
        }
      }
      if (component === 'auto-select' && element.isShowInput) {
        if (typeof data === 'object') {
          this.searchForm[before] = data.value1;
          this.searchForm[after] = data.value2;
        }
      }
      // input带单位
      if (component === 'h-unit-input') {
        this.searchForm[element_code] = data;
      }
      if (['daterange', 'datetimerange', 'monthrange'].includes(type)) {
        console.log(data, 'data');
        // 判断时候存在前后值
        if (this.$bi.isEmpty(before) || this.$bi.isEmpty(after)) {
          this.searchForm[element_code] = data;
        } else {
          if (data && data.length > 0) {
            this.searchForm[before] = data[0];
            this.searchForm[after] = data[1];
          } else {
            this.searchForm[before] = '';
            this.searchForm[after] = '';
          }
        }
      }
      // 判断日期选择类型 - 解决searchFrom对象中对应属性undefined问题
      if (['date', 'datetime', 'month'].includes(type)) {
        this.searchForm[element_code] = data;
      }
      // resetField 如果有关联属性 则当前数据改变时 会去置空关联属性的值
      if (resetField && data) {
        this.searchForm[resetField] = '';
      }
      this.$emit('search-change', data, element_code, this.searchForm);
    },
    // 点击查询按钮
    searchClick() {
      if (this.queryClearSelect) {
        this.$refs.datagrid.clearAll('searchClick');
      }
      this.validSeachForm('dataChange', 1);
    },
    // 查询
    formSearch() {
      this.validSeachForm('dataChange', 1);
    },
    // 重置
    formSearchReset() {
      this.$emit('conditions-reset');
      // this.$set(this, 'searchForm', {})
      // this.searchForm = {};
      const tempCons = this.conditions.filter((v) => v.visable !== false);
      if (tempCons && tempCons.length > 0) {
        tempCons.forEach((item) => {
          if (
            item.component === 'auto-select' &&
            item.data_dict &&
            item.data_dict.multi
          ) {
            this.searchForm[item.element_code] = [];
          } else if (item.component === 'auto-select' && item.isShowInput) {
            this.searchForm[item.before] = '';
            this.searchForm[item.after] = '';
          } else if (item.component === 'auto-select' && item.visable) {
            this.searchForm[item.element_code] = '';
            console.log('auto-select----2222', this.searchForm);
          } else if (item.component === 'date-picker') {
            const refKey = item.element_code || item.before;
            this.$refs[refKey] && this.$refs[refKey][0].$children[0].clearVal();
            if (this.searchForm[item.before]) {
              this.searchForm[item.before] = '';
            }
            if (this.searchForm[item.after]) {
              this.searchForm[item.after] = '';
            }
            this.searchForm[refKey] = '';
          } else if (['k-select-tree'].includes(item.component)) {
            const refKey = item.element_code;
            this.$refs[refKey] && this.$refs[refKey][0].$children[0].reset();
          } else {
            this.searchForm[item.element_code] = '';
          }
        });
      }
      this.$forceUpdate();
      this.conditionDefaultValue();
      this.isRefash = false;
      this.$nextTick(() => {
        this.isRefash = true;
      });
    },
    // 校验组装参数
    validSeachForm(tableEvent, param) {
      if (this.hasPage) {
        // 如果有分页则添加分页入参
        this.searchForm.pageNum = this.current;
        this.searchForm.pageSize = this.pageSize;
      }
      this.$emit('searchTableData', this.searchForm);
    },
    changeCurrent(page) {
      this.current = page;
      this.formSearch();
    },
    changePageSize(pageSize) {
      this.pageSize = pageSize;
      this.formSearch();
    },
    // 表格选中
    onSelectChange(selection, selectInx) {
      // selection选中项
      // 当前选中行
      this.selectionList = selection;
      this.$emit('on-select-change', selection, selectInx);
    },
    // 行点击事件
    onRowClick(selection, index) {
      this.$emit('on-row-click', selection, index);
    },
    // 排序
    onSortChange(column, key, order) {
      // 判断是否已存在筛选
      // if (!this.searchForm.sort) {
      //   this.searchForm.sort = {
      //     orders: [
      //       {
      //         direction: order,
      //         property: key
      //       }
      //     ]
      //   };
      // } else {
      //   if (order === 'normal') {
      //     this.searchForm.sort.orders = this.searchForm.sort.orders.filter(v => v.property === key);
      //   } else {
      //     this.searchForm.sort.orders.push({
      //       direction: order,
      //       property: key
      //     });
      //   }
      // }
      // // 查询
      // this.formSearch();
      this.$emit('on-sort-change', column, key, order);
    },
    onSelectCancel(selection, row) {
      this.$emit('on-select-cancel', selection, row);
    },
    onSelect(selection, row) {
      this.$emit('on-select', selection, row);
    },
    onSelectAll(selection) {
      this.$emit('on-select-all', selection);
    },
    sendselected(selection) {
      this.$emit('sendselected', selection);
    },
    checkBoxChange(value) {
      this.$emit('on-check-box-chane', value);
    },
  },
};
</script>

<style lang="less" scoped>
.layout {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;

  .layout-main {
    flex: 1;

    /deep/ .clearfix {
      height: 100%;
      display: flex;
      flex-direction: column;

      /deep/ .h-table-box {
        flex: 1;
      }
    }
  }

  .h-form-row {
    // 在查询条件是三列的情况下
    /deep/ .h-form-item {
      padding-top: 0;
      padding-bottom: 8px;
    }

    /deep/ .h-form-item:nth-child(3n-2) {
      padding-left: 0;
    }

    /deep/ .h-form-item:nth-child(3n) {
      padding-right: 0;
    }
  }
}

.options-btn__container {
  padding-top: 12px;
  padding-bottom: 8px;
}

.operation-btn {
  // 操作按钮固定在右侧
  text-align: right;

  /deep/ .h-btn-text.more-btn {
    padding: 4px;
  }
}
.label-desc {
  display: inline-block;
  width: 120px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/deep/ .h-tooltip {
  height: 32px;
  .h-tooltip-rel {
    height: 32px;
  }
  .h-tooltip-popper {
    top: 32px;
  }
}
</style>
