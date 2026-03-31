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
        <el-form-item label="事件标题">
          <el-input
            v-model="searchForm.eventTitle"
            placeholder="请输入事件标题"
            clearable
            :maxlength="128"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="事件内容">
          <el-input
            v-model="searchForm.eventContent"
            placeholder="请输入事件内容"
            clearable
            :maxlength="128"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="资产类别">
          <el-select
            v-model="searchForm.assetCategory"
            multiple
            filterable
            placeholder="请选择资产类别"
            clearable
          >
            <el-option
              v-for="item in assetCategoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button type="primary" size="small" @click="openAssetConfigDialog">
            编辑资产类别
          </el-button>
        </el-form-item>

        <el-form-item v-show="filterExpanded" label="事件情绪">
          <el-select v-model="searchForm.eventSentiment" placeholder="请选择" clearable>
            <el-option
              v-for="item in eventSentimentOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-show="filterExpanded" label="板块相关性">
          <el-select v-model="searchForm.impact" placeholder="请选择" clearable>
            <el-option
              v-for="item in impactOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-show="filterExpanded" label="综合影响力">
          <el-select v-model="searchForm.influence" placeholder="请选择" clearable>
            <el-option
              v-for="item in influenceOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-show="filterExpanded" label="资讯发布时间">
          <el-date-picker
            v-model="searchForm.infoPublishTimeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            clearable
          />
        </el-form-item>
        <el-form-item v-show="filterExpanded" label="解读发布时间">
          <el-date-picker
            v-model="searchForm.explainTimeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            clearable
          />
        </el-form-item>
        <el-form-item class="form-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="text" @click="toggleFilterExpanded">{{
            filterExpanded ? '收回' : '展开'
          }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 展示区域 -->
    <el-card class="display-card" shadow="never">
      <!-- 描述部分 -->
      <div class="description-section">
        <div class="description-left">
          <span class="fund-summary">{{ pageSummary }}</span>
        </div>
        <div class="description-right">
          <span class="text">
            <el-link type="primary" :underline="false" @click="handleFilterToday">{{
              formatDateCn(dailyStatsDate)
            }}</el-link>
            新增{{ dailyStatsAddedCount }}条数据，{{ dailyStatsUnprocessedCount }}条未操作。
          </span>
          <el-button type="primary" size="small" @click="openCreateDialog">新增</el-button>
          <el-button type="primary" size="small" @click="openStatisticsDialog">数据总量</el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="tableData"
        border
        stripe
        class="result-table"
        size="small"
        :default-sort="{ prop: 'explainTime', order: 'descending' }"
        @sort-change="handleSortChange"
      >
        <!-- 冻结列：A/B/C（序号、事件标题、事件内容） -->
        <el-table-column type="index" label="序号" width="60" fixed="left" />
        <el-table-column prop="eventTitle" label="事件标题" min-width="220" fixed="left" />
        <el-table-column prop="eventContent" label="事件内容" min-width="260" fixed="left">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-collapse': !row.expandEventContent,
                  'content-expanded': row.expandEventContent,
                }"
              >
                {{ row.eventContent }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.eventContent)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'eventContent')"
              >
                {{ row.expandEventContent ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="eventSummary" label="事件摘要" min-width="220">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-collapse': !row.expandEventSummary,
                  'content-expanded': row.expandEventSummary,
                }"
              >
                {{ row.eventSummary }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.eventSummary)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'eventSummary')"
              >
                {{ row.expandEventSummary ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="assetCategory" label="资产类别" min-width="120" />
        <el-table-column prop="assetName" label="资产名称" min-width="150" />
        <el-table-column prop="eventSentiment" label="事件情绪" min-width="100" />
        <el-table-column prop="rEventInterpretation" label="事件完整解读" min-width="220" />
        <el-table-column prop="interpretation" label="事件100字解读" min-width="200" />
        <el-table-column prop="impact" label="板块相关性" min-width="110" />
        <el-table-column prop="influence" label="综合影响力" min-width="110" />
        <el-table-column prop="importanceScore" label="重要性分数" min-width="100" />
        <el-table-column
          prop="infoPublishTime"
          label="资讯发布时间"
          width="120"
          sortable="custom"
        />
        <el-table-column prop="explainTime" label="解读发布时间" width="120" sortable="custom" />
        <el-table-column label="操作" width="180" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="openViewDialog(row)">查看详情</el-button>
            <el-button type="text" size="mini" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              type="text"
              size="mini"
              class="danger-text-btn"
              @click="handleDisable(row)"
              >{{ row.disabled ? '已停用' : '停用' }}</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
          :current-page="pagination.currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
        />
      </div>
    </el-card>

    <!-- 数据统计弹窗 -->
    <el-dialog
      title="数据总量"
      :visible.sync="statisticsDialogVisible"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div class="statistics-bottom">
        <el-table :data="totalTableData" border style="width: 100%; margin-bottom: 20px">
          <el-table-column type="index" label="序号" width="80" />
          <el-table-column prop="assetCategory" label="资产类别" min-width="120" />
          <el-table-column prop="assetName" label="资产名称" min-width="160" />
          <el-table-column prop="eventNums" label="数据供给" min-width="100" />
          <el-table-column prop="eventCountRate" label="占总量比" min-width="100" />
          <el-table-column prop="auditRate" label="审核完成率" min-width="110" />
          <el-table-column prop="auditApprovedRate" label="审核通过率" min-width="110" />
        </el-table>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="statisticsDialogVisible = false">关 闭</el-button>
      </span>
    </el-dialog>

    <!-- 查看详情弹窗 -->
    <el-dialog
      :title="detailDialogTitle"
      :visible.sync="detailDialogVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        v-if="detailForm"
        :model="detailForm"
        label-width="140px"
        size="small"
        class="detail-form"
      >
        <el-form-item label="事件标题">
          <el-input
            v-model="detailForm.eventTitle"
            :disabled="detailReadOnly"
            :maxlength="128"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="事件内容" class="full-row">
          <el-input
            v-model="detailForm.eventContent"
            :disabled="detailReadOnly"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="事件摘要" class="full-row">
          <el-input
            v-model="detailForm.eventSummary"
            :disabled="detailReadOnly"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="资产类别">
          <el-select
            v-model="detailForm.assetCategory"
            :disabled="detailReadOnly"
            filterable
            clearable
            placeholder="请选择"
          >
            <el-option
              v-for="item in assetCategoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资产名称">
          <el-input v-model="detailForm.assetName" :disabled="detailReadOnly" />
        </el-form-item>
        <el-form-item label="事件情绪">
          <el-select
            v-model="detailForm.eventSentiment"
            :disabled="detailReadOnly"
            clearable
            placeholder="请选择"
          >
            <el-option
              v-for="item in eventSentimentOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="事件完整解读" class="full-row">
          <el-input
            v-model="detailForm.rEventInterpretation"
            :disabled="detailReadOnly"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="事件100字解读" class="full-row">
          <el-input
            v-model="detailForm.interpretation"
            :disabled="detailReadOnly"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item label="板块相关性">
          <el-select
            v-model="detailForm.impact"
            :disabled="detailReadOnly"
            clearable
            placeholder="请选择"
          >
            <el-option
              v-for="item in impactOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="综合影响力">
          <el-select
            v-model="detailForm.influence"
            :disabled="detailReadOnly"
            clearable
            placeholder="请选择"
          >
            <el-option
              v-for="item in influenceOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="重要性分数">
          <el-input v-model="detailForm.importanceScore" :disabled="detailReadOnly" />
        </el-form-item>
        <el-form-item label="资讯发布时间">
          <el-date-picker
            v-model="detailForm.infoPublishTime"
            :disabled="detailReadOnly"
            type="date"
            value-format="yyyy-MM-dd"
            clearable
          />
        </el-form-item>
        <el-form-item label="解读发布时间">
          <el-date-picker
            v-model="detailForm.explainTime"
            :disabled="detailReadOnly"
            type="date"
            value-format="yyyy-MM-dd"
            clearable
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">取 消</el-button>
        <el-button v-if="!detailReadOnly" type="primary" @click="handleDetailSave">保 存</el-button>
      </span>
    </el-dialog>

    <AssetClassConfiguration
      :visible.sync="assetConfigVisible"
      :initial-data="assetClassData"
      @confirm="handleAssetConfigConfirm"
    />
  </div>
</template>

<script>
import AssetClassConfiguration from './AssetClassConfiguration.vue'

export default {
  name: 'EventInterpretation',
  components: { AssetClassConfiguration },
  data() {
    return {
      // 筛选区展开/收回（收回时仅显示第一行）
      filterExpanded: false,
      // 筛选表单
      searchForm: {
        eventTitle: '',
        eventContent: '',
        assetCategory: [],
        eventSentiment: '',
        impact: '',
        influence: '',
        infoPublishTimeRange: [],
        explainTimeRange: [],
      },
      assetCategoryOptions: [
        { label: '股票', value: '股票' },
        { label: '债券', value: '债券' },
        { label: '商品', value: '商品' },
        { label: '外汇', value: '外汇' },
        { label: '基金', value: '基金' },
      ],
      eventSentimentOptions: [
        { label: '利空', value: '利空' },
        { label: '利好', value: '利好' },
        { label: '中性', value: '中性' },
      ],
      impactOptions: [
        { label: '不相关', value: '不相关' },
        { label: '间接相关', value: '间接相关' },
        { label: '直接相关', value: '直接相关' },
      ],
      influenceOptions: [
        { label: '普通', value: '普通' },
        { label: '重要', value: '重要' },
      ],
      // 页面描述
      pageSummary: '事件解读数据检索与展示（默认按解读发布时间降序）。',
      dailyStatsDate: '2025-12-24',
      dailyStatsAddedCount: 789,
      dailyStatsUnprocessedCount: 0,
      // 原始表格数据
      originalTableData: [
        {
          id: 1,
          eventTitle: '事件标题A',
          eventContent:
            '这是一段很长的事件内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。这是一段很长的事件内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。这是一段很长的事件内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。',
          eventSummary:
            '这是一段很长的事件摘要，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。这是一段很长的事件内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。这是一段很长的事件内容，需要展示在表格中，当内容超过3行时需要显示展开按钮来查看更多内容。',
          assetCategory: '股票',
          assetName: '资产A',
          eventSentiment: '利好',
          rEventInterpretation: '完整解读A（示例）',
          interpretation: '100字解读A（示例）',
          impact: '直接相关',
          influence: '重要',
          importanceScore: 85,
          infoPublishTime: '2024-01-15',
          explainTime: '2024-01-20',
          disabled: false,
          expandEventContent: false,
          expandEventSummary: false,
        },
        {
          id: 2,
          eventTitle: '事件标题B',
          eventContent: '事件内容B',
          eventSummary: '事件摘要B',
          assetCategory: '债券',
          assetName: '资产B',
          eventSentiment: '中性',
          rEventInterpretation: '完整解读B（示例）',
          interpretation: '100字解读B（示例）',
          impact: '间接相关',
          influence: '普通',
          importanceScore: 60,
          infoPublishTime: '2024-01-16',
          explainTime: '2024-01-21',
          disabled: false,
          expandEventContent: false,
          expandEventSummary: false,
        },
      ],
      // 排序配置
      sortConfig: {
        prop: 'explainTime',
        order: 'descending',
      },
      // 统计弹窗显示状态
      statisticsDialogVisible: false,
      totalTableData: [
        {
          assetCategory: '股票',
          assetName: '资产A',
          eventNums: 120,
          eventCountRate: '30%',
          auditRate: '80%',
          auditApprovedRate: '75%',
        },
        {
          assetCategory: '债券',
          assetName: '资产B',
          eventNums: 80,
          eventCountRate: '20%',
          auditRate: '70%',
          auditApprovedRate: '68%',
        },
      ],
      // 查看详情弹窗
      detailDialogVisible: false,
      detailForm: null,
      detailMode: 'view', // view | create | edit
      editingRowId: null,
      assetConfigVisible: false,
      assetClassData: [
        { assetName: '股票', assetType: '沪深300', assetStatus: 0, sortOrder: 1 },
        { assetName: '股票', assetType: '中证500', assetStatus: 0, sortOrder: 2 },
        { assetName: '股票', assetType: '上证50', assetStatus: 0, sortOrder: 3 },
        { assetName: '股票', assetType: '创业板', assetStatus: 0, sortOrder: 4 },
        { assetName: '股票', assetType: '科创50', assetStatus: 0, sortOrder: 5 },
        { assetName: '股票', assetType: '恒生指数', assetStatus: 0, sortOrder: 6 },
        { assetName: '股票', assetType: '纳斯达克', assetStatus: 0, sortOrder: 7 },
        { assetName: '股票', assetType: '标普500', assetStatus: 0, sortOrder: 8 },
        { assetName: '债券', assetType: '利率债', assetStatus: 0, sortOrder: 9 },
        { assetName: '债券', assetType: '信用债', assetStatus: 0, sortOrder: 10 },
        { assetName: '商品', assetType: '黄金', assetStatus: 0, sortOrder: 11 },
        { assetName: '商品', assetType: '原油', assetStatus: 0, sortOrder: 12 },
      ],
      tableData: [],
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 0,
      },
    }
  },
  computed: {
    detailReadOnly() {
      return this.detailMode === 'view'
    },
    detailDialogTitle() {
      if (this.detailMode === 'create') return '新增'
      if (this.detailMode === 'edit') return '编辑'
      return '查看详情'
    },
  },
  mounted() {
    // 初始化原始数据
    this.originalTableData = JSON.parse(JSON.stringify(this.originalTableData))
    this.fetchTableData()
  },
  methods: {
    openAssetConfigDialog() {
      this.assetConfigVisible = true
    },
    handleAssetConfigConfirm(newData) {
      this.assetClassData = newData
      // Extract unique asset names for category options
      const uniqueCategories = [...new Set(newData.map(item => item.assetName))]
      this.assetCategoryOptions = uniqueCategories.map(name => ({
        label: name,
        value: name,
      }))
      this.$message.success('资产类别配置已保存')
    },
    toggleFilterExpanded() {
      this.filterExpanded = !this.filterExpanded
    },
    // 查询
    handleSearch() {
      console.log('查询条件：', this.searchForm)
      this.pagination.currentPage = 1
      this.fetchTableData()
    },
    // 重置
    handleReset() {
      this.searchForm = {
        eventTitle: '',
        eventContent: '',
        assetCategory: [],
        eventSentiment: '',
        impact: '',
        influence: '',
        infoPublishTimeRange: [],
        explainTimeRange: [],
      }
      this.pagination.currentPage = 1
      this.fetchTableData()
    },
    // 表格排序
    handleSortChange({ prop, order }) {
      if (!prop || !order) return
      if (prop === 'infoPublishTime' || prop === 'explainTime') {
        this.sortConfig = { prop, order }
        console.log('排序：', { prop, order })
        this.pagination.currentPage = 1
        this.fetchTableData()
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
    handleFilterToday() {
      const d = this.dailyStatsDate
      this.searchForm.infoPublishTimeRange = [d, d]
      this.searchForm.explainTimeRange = [d, d]
      this.$message.success(`已筛选至${this.formatDateCn(d)}当天`)
    },
    formatDateCn(dateStr) {
      const [y, m, d] = (dateStr || '').split('-')
      if (!y || !m || !d) return dateStr
      return `${y}年${m}月${d}号`
    },
    buildEmptyDetailForm() {
      return {
        id: null,
        eventTitle: '',
        eventContent: '',
        eventSummary: '',
        assetCategory: '',
        assetName: '',
        eventSentiment: '',
        rEventInterpretation: '',
        interpretation: '',
        impact: '',
        influence: '',
        importanceScore: '',
        infoPublishTime: '',
        explainTime: '',
        disabled: false,
        expandEventContent: false,
        expandEventSummary: false,
      }
    },
    openViewDialog(row) {
      this.detailMode = 'view'
      this.editingRowId = row.id
      this.detailForm = JSON.parse(JSON.stringify(row))
      this.detailDialogVisible = true
    },
    openEditDialog(row) {
      this.detailMode = 'edit'
      this.editingRowId = row.id
      this.detailForm = JSON.parse(JSON.stringify(row))
      this.detailDialogVisible = true
    },
    openCreateDialog() {
      this.detailMode = 'create'
      this.editingRowId = null
      this.detailForm = this.buildEmptyDetailForm()
      this.detailDialogVisible = true
    },
    handleDetailSave() {
      if (!this.detailForm) return

      if (this.detailMode === 'create') {
        const maxId = this.originalTableData.reduce((m, it) => Math.max(m, Number(it.id) || 0), 0)
        const newRow = {
          ...this.buildEmptyDetailForm(),
          ...JSON.parse(JSON.stringify(this.detailForm)),
          id: maxId + 1,
        }
        this.originalTableData.unshift(newRow)
        this.detailDialogVisible = false
        this.$message.success('新增成功')
        this.fetchTableData()
        return
      }

      if (this.detailMode === 'edit') {
        const idx = this.originalTableData.findIndex(it => it.id === this.editingRowId)
        if (idx === -1) {
          this.$message.error('未找到要编辑的数据')
          return
        }
        const keep = this.originalTableData[idx]
        this.$set(this.originalTableData, idx, {
          ...keep,
          ...JSON.parse(JSON.stringify(this.detailForm)),
        })
        this.detailDialogVisible = false
        this.$message.success('保存成功')
        this.fetchTableData()
      }
    },
    // 停用
    handleDisable(row) {
      if (row.disabled) return
      this.$confirm('确认停用该条数据？', '提示', { type: 'warning' })
        .then(() => {
          this.$set(row, 'disabled', true)
          this.$message.success('已停用')
        })
        .catch(() => {})
    },
    // 数据导出
    handleExport() {
      // TODO: 实现数据导出逻辑
      this.$message.success('导出功能开发中...')
    },
    handlePageSizeChange(val) {
      this.pagination.pageSize = val
      this.pagination.currentPage = 1
      this.fetchTableData()
    },
    handlePageChange(val) {
      this.pagination.currentPage = val
      this.fetchTableData()
    },
    fetchTableData() {
      let data = [...this.originalTableData]
      if (this.searchForm.eventTitle) {
        data = data.filter(
          item => item.eventTitle && item.eventTitle.includes(this.searchForm.eventTitle),
        )
      }
      if (this.searchForm.eventContent) {
        data = data.filter(
          item => item.eventContent && item.eventContent.includes(this.searchForm.eventContent),
        )
      }
      if (this.searchForm.assetCategory && this.searchForm.assetCategory.length > 0) {
        data = data.filter(item => this.searchForm.assetCategory.includes(item.assetCategory))
      }
      if (this.searchForm.eventSentiment) {
        data = data.filter(item => item.eventSentiment === this.searchForm.eventSentiment)
      }
      if (this.searchForm.impact) {
        data = data.filter(item => item.impact === this.searchForm.impact)
      }
      if (this.searchForm.influence) {
        data = data.filter(item => item.influence === this.searchForm.influence)
      }
      if (
        this.searchForm.infoPublishTimeRange &&
        this.searchForm.infoPublishTimeRange.length === 2
      ) {
        const [startDate, endDate] = this.searchForm.infoPublishTimeRange
        data = data.filter(
          item => item.infoPublishTime >= startDate && item.infoPublishTime <= endDate,
        )
      }
      if (this.searchForm.explainTimeRange && this.searchForm.explainTimeRange.length === 2) {
        const [startDate, endDate] = this.searchForm.explainTimeRange
        data = data.filter(item => item.explainTime >= startDate && item.explainTime <= endDate)
      }
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
      this.pagination.total = data.length
      const start = (this.pagination.currentPage - 1) * this.pagination.pageSize
      const end = start + this.pagination.pageSize
      this.tableData = data.slice(start, end)
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
    .table-pagination {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
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
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 16px;
    row-gap: 10px;
    align-items: start;
  }

  /* 表单项：统一高度/宽度与对齐，让每个子项在三列里宽度一致 */
  .search-form :deep(.el-form-item) {
    margin: 0;
    width: 100%;
    display: flex;
  }

  .search-form :deep(.el-form-item__content) {
    flex: 1;
    min-width: 0;
    display: flex;
  }

  /* 控件统一撑满 */
  .search-form :deep(.el-input),
  .search-form :deep(.el-select),
  .search-form :deep(.el-date-editor) {
    width: 100%;
  }

  /* 操作区：跨三列并右对齐 */
  .search-form :deep(.form-actions) {
    grid-column: 1 / -1;
  }

  .search-form :deep(.form-actions .el-form-item__content) {
    justify-content: flex-end;
    gap: 10px;
  }

  /* 操作列文字按钮颜色（停用） */
  .danger-text-btn {
    color: #f56c6c;
  }

  .danger-text-btn.is-disabled,
  .danger-text-btn[disabled] {
    color: #fbc4c4;
  }

  /* 查看详情弹窗：更规整的宽度与对齐 */
  .detail-form {
    max-width: 840px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 18px;
    row-gap: 4px;
  }

  .detail-form :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  .detail-form :deep(.el-form-item__content) {
    min-width: 0;
  }

  .detail-form :deep(.el-input),
  .detail-form :deep(.el-select),
  .detail-form :deep(.el-date-editor) {
    width: 100%;
  }

  .detail-form :deep(.full-row) {
    grid-column: 1 / -1;
  }
}
</style>
