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
        <!-- 研究对象：多选二级下拉 -->
        <el-form-item label="研究对象">
          <el-cascader
            v-model="searchForm.opinionTargets"
            :options="opinionTargetOptions"
            :props="{ multiple: true, checkStrictly: false, emitPath: true }"
            clearable
            collapse-tags
            placeholder="请选择资产类别 / 研究对象"
            style="width: 320px"
          />
        </el-form-item>
        <!-- 未来6个月观点：单选下拉 -->
        <el-form-item label="未来6个月观点">
          <el-select
            v-model="searchForm.opinionEmotion"
            placeholder="请选择观点方向"
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
        <!-- 所属机构：单选下拉 -->
        <el-form-item label="所属机构">
          <el-select
            v-model="searchForm.opinionInstitution"
            placeholder="请选择机构"
            clearable
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="item in institutionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <!-- 更新时间：日期区间 -->
        <el-form-item label="更新时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
            clearable
            style="width: 260px"
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
          <span class="text">示例数据用于展示机构观点解读效果。</span>
          <el-button type="primary" size="small" @click="openCreate">新增观点</el-button>
          <el-button type="primary" size="small" @click="openStatisticsDialog">数据统计</el-button>
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
        <el-table-column prop="assetsType" label="资产类别" min-width="120" fixed="left" />
        <el-table-column prop="opinionTarget" label="研究对象" min-width="180" fixed="left" />

        <el-table-column prop="trackingIndex" label="跟踪指数" min-width="160" />
        <el-table-column prop="opinionEmotion" label="未来6个月观点" width="130" />
        <el-table-column prop="opinionDescription" label="论据摘要" min-width="260">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-collapse': !row.expandOpinionDescription,
                  'content-expanded': row.expandOpinionDescription,
                }"
              >
                {{ row.opinionDescription }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.opinionDescription)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'opinionDescription')"
              >
                {{ row.expandOpinionDescription ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="argumentDetail" label="论据详情" min-width="260">
          <template slot-scope="{ row }">
            <div class="expandable-content">
              <div
                :class="{
                  'content-collapse': !row.expandArgumentDetail,
                  'content-expanded': row.expandArgumentDetail,
                }"
              >
                {{ row.argumentDetail }}
              </div>
              <el-button
                v-if="shouldShowExpand(row.argumentDetail)"
                type="text"
                size="mini"
                @click="toggleExpand(row, 'argumentDetail')"
              >
                {{ row.expandArgumentDetail ? '收起' : '展开' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="opinion" label="机构" min-width="160" />
        <el-table-column prop="gmtCreate" label="创建时间" width="160" />
        <el-table-column prop="gmtModified" label="更新时间" width="160" sortable="custom" />
        <el-table-column prop="dataSource" label="数据来源" min-width="140" />
      </el-table>
      <div class="pagination-container">
        <el-pagination
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
        >
        </el-pagination>
      </div>
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
    <InstitutionViewpointCreate
      v-if="createVisible"
      :existing-data="originalTableData"
      @close="createVisible = false"
    />
  </div>
</template>

<script>
import InstitutionViewpointCreate from './InstitutionViewpointCreate.vue'
export default {
  name: 'InstitutionViewpoint',
  components: {
    InstitutionViewpointCreate,
  },
  data() {
    return {
      // 筛选表单
      searchForm: {
        opinionTargets: [],
        opinionEmotion: '',
        opinionInstitution: '',
        dateRange: [],
      },
      // 分页配置
      currentPage: 1,
      pageSize: 10,
      total: 0,
      tableData: [], // 当前页数据

      // 研究对象二级选项（示例）
      opinionTargetOptions: [
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
            { value: '国债指数', label: '国债指数' },
            { value: '信用债指数', label: '信用债指数' },
          ],
        },
        {
          value: '商品',
          label: '商品',
          children: [
            { value: '黄金指数', label: '黄金指数' },
            { value: '原油指数', label: '原油指数' },
          ],
        },
      ],
      // 情绪方向选项
      emotionOptions: [
        { label: '利空', value: '利空' },
        { label: '利好', value: '利好' },
        { label: '中性', value: '中性' },
      ],
      // 所属机构选项（示例）
      institutionOptions: [
        { label: '机构A', value: '机构A' },
        { label: '机构B', value: '机构B' },
        { label: '机构C', value: '机构C' },
      ],
      // 一句话描述
      fundSummary: '按筛选条件展示机构对各资产类别研究对象的未来6个月观点及论据。',
      // 原始表格数据（示例）
      originalTableData: [
        {
          id: 1,
          assetsType: '股票',
          opinionTarget: '沪深300',
          trackingIndex: '沪深300指数',
          opinionEmotion: '利好',
          opinionDescription:
            '机构A认为未来6个月沪深300基本面有望改善，盈利预期上修，海外流动性宽松叠加国内政策友好，整体风险偏好有望回升。该结论基于宏观、估值与资金面多维度分析，具备一定前瞻性假设与不确定性。',
          argumentDetail:
            '1）宏观层面，预计未来两个季度名义GDP增速回升，对盈利形成支撑；2）盈利端，当前盈利预期处于下修尾部，未来存在上修弹性；3）估值端，沪深300市盈率处于近五年历史分位数偏低位置，性价比较高；4）资金面，海外流动性拐点及国内政策持续发力，有望带来增量资金；5）风险提示：外部环境不确定性、企业盈利修复不及预期等。',
          opinion: '机构A',
          gmtCreate: '2024-01-10 09:00:00',
          gmtModified: '2024-01-20 10:30:00',
          dataSource: '内部研究',
          expandOpinionDescription: false,
          expandArgumentDetail: false,
        },
        {
          id: 2,
          assetsType: '债券',
          opinionTarget: '国债指数',
          trackingIndex: '中证国债指数',
          opinionEmotion: '中性',
          opinionDescription: '机构B认为未来6个月国债收益率窄幅震荡，配置价值仍存但弹性有限。',
          argumentDetail:
            '在经济增速温和与通胀中枢较低的背景下，货币政策保持中性略宽松，利率债收益率中枢或小幅下移但空间有限。长端收益率受期限溢价与供给压力制约，收益与风险比相对均衡。整体看，更适合作为组合底仓与流动性管理工具。',
          opinion: '机构B',
          gmtCreate: '2024-01-12 14:20:00',
          gmtModified: '2024-01-18 09:15:00',
          dataSource: '外部研报',
          expandOpinionDescription: false,
          expandArgumentDetail: false,
        },
        {
          id: 3,
          assetsType: '商品',
          opinionTarget: '黄金指数',
          trackingIndex: 'COMEX黄金指数',
          opinionEmotion: '利空',
          opinionDescription: '机构C认为未来6个月黄金在实际利率上行背景下承压，避险需求边际回落。',
          argumentDetail:
            '若美联储货币政策维持偏紧或降息节奏弱于预期，实际利率存在抬升压力，对无息资产黄金估值形成压制。同时，若全球金融市场波动收敛、避险情绪回落，黄金的配置需求将有所减弱。但中长期仍需关注地缘政治等尾部风险带来的阶段性对冲需求。',
          opinion: '机构C',
          gmtCreate: '2024-02-01 11:00:00',
          gmtModified: '2024-02-05 14:00:00',
          dataSource: '公募基金季报',
          expandOpinionDescription: false,
          expandArgumentDetail: false,
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
      createVisible: false,
    }
  },
  mounted() {
    // 初始化原始数据
    this.originalTableData = JSON.parse(JSON.stringify(this.originalTableData))
    // 模拟更多数据以测试分页
    const baseData = [...this.originalTableData]
    for (let i = 0; i < 4; i++) {
      baseData.forEach(item => {
        this.originalTableData.push({
          ...item,
          id: this.originalTableData.length + 1,
        })
      })
    }
    this.fetchData()
  },
  methods: {
    openCreate() {
      this.createVisible = true
    },
    // 获取数据（模拟接口）
    fetchData() {
      let data = [...this.originalTableData]

      // 研究对象多选筛选（二维 path：[[assetsType, opinionTarget], ...]）
      if (this.searchForm.opinionTargets && this.searchForm.opinionTargets.length > 0) {
        const selections = this.searchForm.opinionTargets
        data = data.filter(item => {
          return selections.some(path => {
            const [assetsType, opinionTarget] = path
            const matchAssetsType = !assetsType || item.assetsType === assetsType
            const matchOpinionTarget = !opinionTarget || item.opinionTarget === opinionTarget
            return matchAssetsType && matchOpinionTarget
          })
        })
      }

      // 未来6个月观点筛选
      if (this.searchForm.opinionEmotion) {
        data = data.filter(item => item.opinionEmotion === this.searchForm.opinionEmotion)
      }

      // 所属机构筛选
      if (this.searchForm.opinionInstitution) {
        data = data.filter(item => item.opinion === this.searchForm.opinionInstitution)
      }

      // 更新时间日期区间筛选（按 gmtModified 的日期部分 yyyy-MM-dd）
      if (this.searchForm.dateRange && this.searchForm.dateRange.length === 2) {
        const [start, end] = this.searchForm.dateRange
        data = data.filter(item => {
          if (!item.gmtModified) return false
          const dateStr = item.gmtModified.slice(0, 10)
          return dateStr >= start && dateStr <= end
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

      // 分页逻辑
      this.total = data.length
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      this.tableData = data.slice(start, end)
    },
    // 分页大小改变
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.fetchData()
    },
    // 当前页改变
    handleCurrentChange(val) {
      this.currentPage = val
      this.fetchData()
    },
    // 查询
    handleSearch() {
      this.currentPage = 1
      this.fetchData()
    },
    // 重置
    handleReset() {
      this.searchForm = {
        opinionTargets: [],
        opinionEmotion: '',
        opinionInstitution: '',
        dateRange: [],
      }
      this.currentPage = 1
      this.fetchData()
    },
    // 表格排序
    handleSortChange({ prop, order }) {
      if (!prop || !order) {
        this.sortConfig = { prop: 'gmtModified', order: 'descending' }
      } else {
        this.sortConfig = { prop, order }
      }
      this.fetchData()
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

  .pagination-container {
    margin-top: 20px;
    text-align: right;
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
