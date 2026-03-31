<template>
  <div class="event-interpretation">
    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form
        :inline="true"
        :model="searchForm"
        class="search-form"
        label-width="100px"
        size="small"
      >
        <!-- 统计时间（YYYY-MM） -->
        <el-form-item label="统计时间">
          <el-date-picker
            v-model="searchForm.timeCycle"
            type="month"
            placeholder="请选择统计月份"
            value-format="yyyy-MM"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <!-- 资产板块：多选二级下拉 -->
        <el-form-item label="资产板块">
          <el-cascader
            v-model="searchForm.assetSelections"
            :options="assetOptions"
            :props="{ multiple: true, checkStrictly: false, emitPath: true }"
            clearable
            collapse-tags
            placeholder="请选择资产类别 / 资产名称"
            style="width: 320px"
          />
        </el-form-item>
        <!-- 情绪方向 -->
        <el-form-item label="情绪方向">
          <el-select
            v-model="searchForm.emotion"
            placeholder="请选择情绪方向"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="item in emotionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
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
        :default-sort="{ prop: 'gmtModified', order: 'descending' }"
        @sort-change="handleSortChange"
      >
        <!-- 固定前三列 -->
        <el-table-column type="index" label="序号" width="60" fixed="left" />
        <el-table-column prop="timeCycle" label="统计时间范围" min-width="140" fixed="left" />
        <el-table-column prop="type" label="资产类别" min-width="120" fixed="left" />

        <el-table-column prop="plateName" label="资产名称" min-width="160" />
        <el-table-column prop="emotion" label="事件情绪" width="100" />
        <el-table-column prop="interpretation" label="完整解读" min-width="260">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-collapse': !row.expandInterpretation,
                  'content-expanded': row.expandInterpretation,
                }"
              >
                {{ row.interpretation }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.interpretation)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'interpretation')"
              >
                {{ row.expandInterpretation ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="smallInterpretation" label="精简解读" min-width="220" />
        <el-table-column prop="gmtModified" label="解读发布时间" width="160" sortable="custom" />
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
      width="900px"
      :close-on-click-modal="false"
    >
      <!-- 上部分：概要信息 -->
      <div class="statistics-top">
        <div class="statistics-row">
          <div class="statistics-item-left">
            <span class="label">当前统计时间：</span>
            <span class="value">{{ searchForm.timeCycle || '-' }}</span>
          </div>
          <div class="statistics-item-right">
            <el-button type="primary" size="small" @click="handleExport"> 数据导出 </el-button>
          </div>
        </div>
      </div>

      <!-- 下部分：数据统计表 -->
      <div class="statistics-bottom">
        <el-table :data="statisticsTableData" border style="width: 100%; margin-bottom: 20px">
          <el-table-column type="index" label="序号" width="80" />
          <el-table-column prop="blockName" label="资产类别" min-width="120" />
          <el-table-column prop="plateName" label="资产名称" min-width="160" />
          <el-table-column prop="nums" label="解读数量" min-width="100" />
          <el-table-column prop="autoApprovedRate" label="审核完成率" min-width="120" />
          <el-table-column prop="auditApprovedRate" label="审核通过率" min-width="120" />
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
  name: 'MonthlyAssetSectorEventInterpretation',
  data() {
    return {
      // 筛选表单
      searchForm: {
        timeCycle: '',
        assetSelections: [],
        emotion: '',
      },
      // 资产板块二级选项
      assetOptions: [
        {
          value: '股票',
          label: '股票',
          children: [
            { value: '上证指数', label: '上证指数' },
            { value: '沪深300', label: '沪深300' },
          ],
        },
        {
          value: '债券',
          label: '债券',
          children: [
            { value: '国债', label: '国债' },
            { value: '信用债', label: '信用债' },
          ],
        },
        {
          value: '商品',
          label: '商品',
          children: [
            { value: '黄金', label: '黄金' },
            { value: '原油', label: '原油' },
          ],
        },
      ],
      // 情绪方向选项
      emotionOptions: [
        { label: '利空', value: '利空' },
        { label: '利好', value: '利好' },
        { label: '中性', value: '中性' },
      ],
      // 一句话描述
      fundSummary: '按统计时间和资产板块，展示资产板块事件情绪解读结果。',
      // 原始表格数据
      originalTableData: [
        {
          id: 1,
          timeCycle: '2024-01',
          type: '股票',
          plateName: '沪深300',
          emotion: '利好',
          interpretation:
            '这是一段关于沪深3011111111111111111111111111111111111111111111111111111111111111111110在当月资产板块事件的完整解读内容，当内容超过三行时会显示“展开/收起”按钮，用于查看全部内容。这里可以模拟较长的一段话，用于测试三行截断展示效果。',
          smallInterpretation: '沪深300当月整体偏利好，资金净流入，市场风险偏好回升。',
          gmtModified: '2024-01-20 10:30:00',
          expandInterpretation: false,
        },
        {
          id: 2,
          timeCycle: '2024-01',
          type: '债券',
          plateName: '国债',
          emotion: '中性',
          interpretation: '国债收益率小幅波动，总体维持震荡格局。',
          smallInterpretation: '国债收益率变化有限，情绪中性。',
          gmtModified: '2024-01-18 09:15:00',
          expandInterpretation: false,
        },
        {
          id: 3,
          timeCycle: '2024-02',
          type: '商品',
          plateName: '黄金',
          emotion: '利空',
          interpretation: '美元走强和实际利率抬升对黄金价格形成压制，避险情绪边际回落。',
          smallInterpretation: '美元走强打压黄金，情绪偏空。',
          gmtModified: '2024-02-05 14:00:00',
          expandInterpretation: false,
        },
      ],
      // 排序配置
      sortConfig: {
        prop: 'gmtModified',
        order: 'descending',
      },
      // 统计弹窗显示状态
      statisticsDialogVisible: false,
      // 统计表格数据
      statisticsTableData: [
        {
          blockName: '股票',
          plateName: '沪深300',
          nums: 15,
          autoApprovedRate: '90%',
          auditApprovedRate: '85%',
        },
        {
          blockName: '债券',
          plateName: '国债',
          nums: 10,
          autoApprovedRate: '80%',
          auditApprovedRate: '75%',
        },
      ],
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

      // 统计时间筛选（YYYY-MM）
      if (this.searchForm.timeCycle) {
        data = data.filter(item => item.timeCycle === this.searchForm.timeCycle)
      }

      // 资产板块多选筛选（二维 path：[[assetCategory, plateName], ...]）
      if (this.searchForm.assetSelections && this.searchForm.assetSelections.length > 0) {
        const selections = this.searchForm.assetSelections
        data = data.filter(item => {
          return selections.some(path => {
            const [assetCategory, plateName] = path
            const matchCategory = !assetCategory || item.type === assetCategory
            const matchPlate = !plateName || item.plateName === plateName
            return matchCategory && matchPlate
          })
        })
      }

      // 情绪方向筛选
      if (this.searchForm.emotion) {
        data = data.filter(item => item.emotion === this.searchForm.emotion)
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
    // 查询
    handleSearch() {
      console.log('查询条件：', this.searchForm)
      this.pagination.currentPage = 1
      this.fetchData()
    },
    // 重置
    handleReset() {
      this.searchForm = {
        timeCycle: '',
        assetSelections: [],
        emotion: '',
      }
      this.pagination.currentPage = 1
      this.fetchData()
    },
    // 表格排序
    handleSortChange({ prop, order }) {
      if (!prop || !order) {
        this.sortConfig = { prop: 'gmtModified', order: 'descending' }
        this.fetchData()
        return
      }
      if (prop === 'gmtModified') {
        this.sortConfig = { prop, order }
        this.fetchData()
      }
    },
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
}
</style>
