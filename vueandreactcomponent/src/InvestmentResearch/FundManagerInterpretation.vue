<template>
  <div class="event-interpretation">
    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form
        :inline="true"
        :model="searchForm"
        class="search-form"
        label-width="120px"
        size="small"
      >
        <el-form-item label="基金经理">
          <el-input
            v-model="searchForm.fundManagerName"
            placeholder="请输入基金简称"
            clearable
            style="width: 200px"
            :maxlength="32"
            show-word-limit
            @input="handleFundAbbrInput"
          />
        </el-form-item>
        <el-form-item label="基金经理Code">
          <el-input
            v-model="searchForm.fundManagerCode"
            placeholder="请输入基金代码"
            clearable
            style="width: 200px"
            show-word-limit
            :maxlength="16"
            @input="handleFundCodeInput"
          />
        </el-form-item>
        <el-form-item label="解读框架">
          <el-select
            v-model="searchForm.explainFrame"
            multiple
            filterable
            placeholder="请选择解读框架"
            clearable
            style="width: 300px"
          >
            <el-option
              v-for="item in explainFrameOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数据截止日期">
          <el-date-picker
            v-model="searchForm.date"
            type="date"
            placeholder="选择数据截止日期"
            value-format="yyyy-MM-dd"
            clearable
            style="width: 200px"
            :picker-options="endDatePickerOptions"
          />
        </el-form-item>
        <el-form-item label="解读发布时间">
          <el-date-picker
            v-model="searchForm.startDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            :picker-options="datePickerOptions"
            clearable
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 展示区域 -->
    <el-card class="display-card" shadow="never">
      <!-- 描述部分 -->
      <div class="description-section">
        <div class="description-left">
          <span class="fund-summary">{{ fundSummary }}</span>
        </div>
        <div class="description-right">
          <span class="text">2025年12月24号新增789条数据，0条未操作。</span>
          <el-button type="primary" size="small" @click="openStatisticsDialog"
            >数据覆盖度统计</el-button
          >
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="tableData"
        border
        stripe
        class="result-table"
        size="small"
        :default-sort="{ prop: 'fundManagerCode', order: 'ascending' }"
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="序号" width="60" fixed="left" />
        <el-table-column prop="fundManagerName" label="基金经理" min-width="150" fixed="left">
        </el-table-column>
        <el-table-column
          prop="fundManagerCode"
          label="基金经理Code"
          width="140"
          sortable="custom"
          fixed="left"
        />
        <el-table-column prop="inOffice" label="是否在职" width="140" />
        <el-table-column prop="inOfficeYear" label="从业年限" width="140" />
        <el-table-column prop="explainFrame" label="解读框架" min-width="150" />
        <el-table-column prop="category" label="基金经理分类" min-width="120" />
        <el-table-column prop="explainContent" label="生成内容" min-width="200">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-collapse': !row.expandExplainContent,
                  'content-expanded': row.expandExplainContent,
                }"
              >
                {{ row.explainContent }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.explainContent)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'explainContent')"
              >
                {{ row.expandExplainContent ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="explainDimensions" label="解读维度" min-width="150">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-expanded': row.expandExplainDimensions,
                  'content-collapse': !row.expandExplainDimensions,
                }"
              >
                {{ row.explainDimensions }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.explainDimensions)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'explainDimensions')"
              >
                {{ row.expandExplainDimensions ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="explainDirection" label="解读方向" min-width="120">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-expanded': row.expandExplainDirection,
                  'content-collapse': !row.expandExplainDirection,
                }"
              >
                {{ row.explainDirection }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.explainDirection)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'explainDirection')"
              >
                {{ row.expandExplainDirection ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="数据截止日期" width="120" />
        <el-table-column prop="startDate" label="解读发布时间" width="120" sortable="custom" />
      </el-table>

      <!-- 分页 -->
      <el-pagination
        background
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="pagination.currentPage"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pagination.pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
        style="margin-top: 20px; text-align: right"
      >
      </el-pagination>
    </el-card>

    <!-- 数据统计弹窗 -->
    <el-dialog
      title="数据统计"
      :visible.sync="statisticsDialogVisible"
      width="1200px"
      :close-on-click-modal="false"
    >
      <!-- 上部分：数据总量 -->
      <div class="statistics-top">
        <!-- 第一行 -->
        <div class="statistics-row">
          <div class="statistics-item-left">
            <span class="label">基金总量：</span>
            <span class="value">{{ statisticsData.fundTotal }}</span>
          </div>
          <div class="statistics-item-right">
            <span class="label">数据截止日期：</span>
            <span class="value">{{ statisticsData.date }}</span>
            <el-button type="primary" size="small" style="margin-left: 10px" @click="handleExport">
              数据导出
            </el-button>
          </div>
        </div>
        <!-- 第二行：三列展示 -->
        <div class="statistics-row statistics-three-columns">
          <div class="statistics-column">
            <div class="column-label">应跑基金总量</div>
            <div class="column-value">{{ statisticsData.shouldRunTotal }}</div>
          </div>
          <div class="statistics-column">
            <div class="column-label">有论据基金总量</div>
            <div class="column-value">{{ statisticsData.withArgumentTotal }}</div>
          </div>
          <div class="statistics-column">
            <div class="column-label">兜底基金总量</div>
            <div class="column-value">{{ statisticsData.fallbackTotal }}</div>
          </div>
        </div>
      </div>

      <!-- 下部分：数据分布 -->
      <div class="statistics-bottom">
        <div class="section-title">数据分布</div>
        <el-table
          :data="distributionTableData"
          row-key="index"
          border
          :default-expand-all="false"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        >
          style="width: 100%; margin-bottom: 20px;" >
          <el-table-column prop="index" label="框架序号" width="120" />
          <el-table-column prop="frameName" label="解读框架" />
          <el-table-column prop="argument" label="有值论据" />
          <el-table-column prop="nums" label="命中数量" />
          <el-table-column label="占基金总量比例">
            <template slot-scope="scope"> {{ scope.row.rate }}% </template>
          </el-table-column>
        </el-table>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="statisticsDialogVisible = false">关 闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'EventInterpretation',
  data() {
    return {
      // 筛选表单
      searchForm: {
        fundManagerName: '',
        fundManagerCode: '',
        explainFrame: [],
        date: '',
        startDateRange: [],
      },
      // 解读框架选项
      explainFrameOptions: [
        { label: '框架A', value: 'frameA' },
        { label: '框架B', value: 'frameB' },
        { label: '框架C', value: 'frameC' },
        { label: '框架D', value: 'frameD' },
      ],

      endDatePickerOptions: {
        disabledDate(time) {
          const now = new Date()
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          const isWeekend = time.getDay() === 0 || time.getDay() === 6
          return (
            time.getTime() > now.getTime() || time.getTime() < oneMonthAgo.getTime() || isWeekend
          )
        },
      },
      // 日期选择器配置（限制一月内）
      datePickerOptions: {
        disabledDate(time) {
          const now = new Date()
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return time.getTime() > now.getTime() || time.getTime() < oneMonthAgo.getTime()
        },
      },
      // 基金一句话描述
      fundSummary: '这是一只优秀的基金产品，具有良好的市场表现和投资价值。',
      // 基金简称搜索
      fundAbbrSearch: '',
      // 原始表格数据
      originalTableData: [
        {
          id: 1,
          fundManagerName: '基金A',
          fundManagerCode: '000001',
          explainFrame: '框架A',
          category: '股票型',
          explainContent:
            '11111111111111111111111111111111111111111这是一段很长的解读内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。这是一段很长的解读内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。这是一段很长的解读内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。',
          explainDimensions:
            'qwqw1211111111111111111111111111111111111111111111111111111222222222222222222222222维度1、维度2、维度3、维度4、维度5',
          explainDirection:
            '11111111111111111111111111111222222222222222222222222222222221212222222222222222222222221111向上、向下、持平、向上、向下、持平',
          date: '2024-01-15',
          startDate: '2024-01-20',
          expandExplainContent: false,
          expandExplainDimensions: false,
          expandExplainDirection: false,
        },
        {
          id: 2,
          fundManagerName: '基金B',
          fundManagerCode: '000002',
          explainFrame: '框架B',
          category: '混合型',
          explainContent: '解读内容B',
          explainDimensions: '维度B',
          explainDirection: '方向B',
          date: '2024-01-16',
          startDate: '2024-01-21',
          expandExplainContent: false,
          expandExplainDimensions: false,
          expandExplainDirection: false,
        },
      ],
      // 排序配置
      sortConfig: {
        prop: 'fundManagerCode',
        order: 'ascending',
      },
      // 统计弹窗显示状态
      statisticsDialogVisible: false,
      // 统计数据
      statisticsData: {
        fundTotal: 100,
        date: '2024-01-15',
        shouldRunTotal: 80,
        withArgumentTotal: 65,
        fallbackTotal: 15,
      },
      // 临时修改 distributionTableData 数据（删除 hasChildren 字段）
      distributionTableData: [
        {
          index: '1',
          frameName: '框架A',
          argument: '论据A1',
          nums: 30,
          rate: 30,
          // 移除 hasChildren: true
          children: [
            { index: '1-1', frameName: '框架A-子项1', argument: '论据A1-1', nums: 20, rate: 20 },
            { index: '1-2', frameName: '框架A-子项2', argument: '论据A1-2', nums: 10, rate: 10 },
          ],
        },
        {
          index: '2',
          frameName: '框架B',
          argument: '论据B1',
          nums: 25,
          rate: 25,
          // 移除 hasChildren: true
          children: [
            { index: '2-1', frameName: '框架B-子项1', argument: '论据B1-1', nums: 15, rate: 15 },
            { index: '2-2', frameName: '框架B-子项2', argument: '论据B1-2', nums: 10, rate: 10 },
          ],
        },
      ],
      // 展开的行
      expandedRows: {},
      // 分页配置
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 0,
      },
      // 表格显示数据
      tableData: [],
    }
  },
  mounted() {
    // 初始化原始数据
    this.originalTableData = JSON.parse(JSON.stringify(this.originalTableData))
    this.fetchData()
  },
  methods: {
    // 获取数据
    fetchData() {
      let data = [...this.originalTableData]

      // 基金简称模糊查询
      if (this.fundAbbrSearch) {
        data = data.filter(
          item => item.fundManagerName && item.fundManagerName.includes(this.fundAbbrSearch),
        )
      }

      // 其他筛选条件
      if (this.searchForm.fundManagerName) {
        data = data.filter(
          item =>
            item.fundManagerName && item.fundManagerName.includes(this.searchForm.fundManagerName),
        )
      }
      if (this.searchForm.fundManagerCode) {
        data = data.filter(
          item =>
            item.fundManagerCode && item.fundManagerCode.includes(this.searchForm.fundManagerCode),
        )
      }
      if (this.searchForm.explainFrame && this.searchForm.explainFrame.length > 0) {
        data = data.filter(item => this.searchForm.explainFrame.includes(item.explainFrame))
      }
      if (this.searchForm.date) {
        data = data.filter(item => item.date === this.searchForm.date)
      }
      if (this.searchForm.startDateRange && this.searchForm.startDateRange.length === 2) {
        const [startDate, endDate] = this.searchForm.startDateRange
        data = data.filter(item => {
          return item.startDate >= startDate && item.startDate <= endDate
        })
      }

      // 排序
      if (this.sortConfig.prop) {
        data.sort((a, b) => {
          const aVal = a[this.sortConfig.prop]
          const bVal = b[this.sortConfig.prop]
          if (this.sortConfig.order === 'ascending') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
          }
        })
      }

      // 更新总数
      this.pagination.total = data.length

      // 分页截取
      const start = (this.pagination.currentPage - 1) * this.pagination.pageSize
      const end = start + this.pagination.pageSize
      this.tableData = data.slice(start, end)
    },
    // 分页大小改变
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.pagination.currentPage = 1
      this.fetchData()
    },
    // 当前页改变
    handleCurrentChange(val) {
      this.pagination.currentPage = val
      this.fetchData()
    },
    // 基金简称输入（仅中文，且最多 32 个中文字符）
    handleFundAbbrInput(value) {
      if (!value) {
        this.searchForm.fundAbbr = ''
        return
      }
      // 只保留中文字符
      const chineseOnly = value.match(/[\u4e00-\u9fa5]/g)
      const result = chineseOnly ? chineseOnly.join('') : ''
      // 限制最多 32 个中文字符
      this.searchForm.fundAbbr = result.slice(0, 64)
    },
    // 基金代码输入（仅数字和字母，最多 6 位）
    handleFundCodeInput(value) {
      if (!value) {
        this.searchForm.fundCode = ''
        return
      }
      const matched = value.match(/[0-9a-zA-Z]/g)
      const result = matched ? matched.join('') : ''
      this.searchForm.fundCode = result.slice(0, 16)
    },
    // 查询
    handleSearch() {
      console.log('查询条件：', this.searchForm)
      this.pagination.currentPage = 1
      this.fetchData()
    },
    // 重置
    handleReset() {
      this.searchForm = {
        fundManagerName: '',
        fundManagerCode: '',
        explainFrame: [],
        date: '',
        startDateRange: [],
      }
      this.pagination.currentPage = 1
      this.fetchData()
    },
    // 表格排序
    handleSortChange({ prop, order }) {
      if (prop === 'fundManagerCode' || prop === 'startDate') {
        this.sortConfig = { prop, order }
        this.fetchData()
      }
    },
    // // 基金简称筛选
    // handleFundAbbrFilter() {
    //   // 通过 computed 属性自动过滤
    // },
    // 判断是否需要显示展开按钮（超过3行）
    shouldShowExpand(content) {
      if (!content) return false
      // 简单的判断：如果内容长度超过某个阈值，认为超过3行
      // 实际可以使用更精确的方法，比如计算实际行数
      return content.length > 100
    },
    // 切换展开/收起
    toggleExpand(row, field) {
      const expandField = `expand${field.charAt(0).toUpperCase() + field.slice(1)}`
      this.$set(row, expandField, !row[expandField])
    },
    // 打开统计弹窗
    openStatisticsDialog() {
      // TODO: 根据当前表格数据查询统计数据
      this.statisticsDialogVisible = true
    },
    // 数据导出
    handleExport() {
      // TODO: 实现数据导出逻辑
      this.$message.success('导出功能开发中...')
    },
  },
}
</script>

<style scoped lang="scss">
.event-interpretation {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 40px);

  .filter-card {
    margin-bottom: 20px;
    background-color: #fff;

    .search-form {
      padding: 10px 0;
    }
  }

  .display-card {
    background-color: #fff;

    .description-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #ebeef5;
      margin-bottom: 15px;

      .description-left {
        flex: 1;

        .fund-summary {
          font-size: 14px;
          color: #606266;
        }
      }

      .description-right {
        display: flex;
        align-items: center;
        gap: 10px;

        .text {
          font-size: 14px;
          color: #606266;
        }
      }
    }

    .result-table {
      .expandable-content {
        width: 100%;

        /* 折叠状态样式（明确类名） */
        .content-collapse {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
          word-wrap: break-word;
        }

        /* 展开状态样式 */
        .content-expanded {
          white-space: normal;
          word-wrap: break-word;
          overflow: visible;
          /* 确保展开后内容完全显示 */
        }

        /* 按钮样式优化 */
        .el-button {
          margin-top: 5px;
          color: #409eff;
        }
      }

      //   .expandable-content {
      //     .content-expanded {
      //       white-space: normal;
      //       word-wrap: break-word;
      //     }

      //     div:not(.content-expanded) {
      //       display: -webkit-box;
      //       -webkit-line-clamp: 3;
      //       line-clamp: 3;
      //       -webkit-box-orient: vertical;
      //       overflow: hidden;
      //       text-overflow: ellipsis;
      //       white-space: normal;
      //       word-wrap: break-word;
      //     }
      //   }
    }
  }

  // 统计弹窗样式
  .statistics-top {
    margin-bottom: 30px;

    .statistics-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      &.statistics-three-columns {
        display: flex;
        gap: 20px;
        margin-top: 20px;

        .statistics-column {
          flex: 1;
          padding: 15px;
          background-color: #f5f7fa;
          border-radius: 4px;
          text-align: center;

          .column-label {
            font-size: 14px;
            color: #606266;
            margin-bottom: 10px;
          }

          .column-value {
            font-size: 24px;
            font-weight: bold;
            color: #409eff;
          }
        }
      }

      .statistics-item-left,
      .statistics-item-right {
        display: flex;
        align-items: center;

        .label {
          font-size: 14px;
          color: #606266;
          margin-right: 5px;
        }

        .value {
          font-size: 14px;
          color: #303133;
          font-weight: 500;
        }
      }
    }
  }

  .statistics-bottom {
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #303133;
      margin-bottom: 15px;
    }

    .distribution-table {
      .expand-icon {
        cursor: pointer;
        display: inline-block;
        width: 20px;
        text-align: center;
        color: #409eff;
        margin-right: 5px;
        user-select: none;
      }

      .index-text {
        cursor: pointer;
        user-select: none;
        color: #409eff;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }

  /* 电脑端表单样式 */
  .search-form {
    display: flex;
    align-items: center;
    gap: 15px;
    /* 统一表单项之间的间距，替代默认margin的混乱 */
    flex-wrap: wrap;
    /* 极端窄屏（如小尺寸电脑）时自动换行，避免溢出 */
  }

  /* 清除Element默认的表单项底边距，避免布局错位 */
  .search-form :deep(.el-form-item) {
    margin-bottom: 0;
  }
}
</style>
