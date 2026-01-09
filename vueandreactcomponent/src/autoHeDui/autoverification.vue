<template>
  <div class="auto-verification">
    <!-- 查询条件：核对时间 + 核对结果 -->
    <el-form :inline="true" :model="searchForm" class="search-form" label-width="90px" size="small">
      <el-form-item label="核对时间">
        <el-date-picker
          v-model="searchForm.checkTimeRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="yyyy-MM-dd HH:mm:ss"
          :default-time="['00:00:00', '23:59:59']"
        />
      </el-form-item>
      <el-form-item label="核对结果">
        <el-select
          v-model="searchForm.checkResult"
          placeholder="请选择结果"
          clearable
          style="width: 160px"
        >
          <el-option label="成功" value="成功" />
          <el-option label="存在不一致" value="存在不一致" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 自动核对列表 -->
    <el-table :data="tableDataFiltered" border stripe class="result-table" size="small">
      <el-table-column prop="startTime" label="核对起始时间" width="180" />
      <el-table-column prop="endTime" label="核对终止时间" width="180" />
      <el-table-column prop="checkResult" label="核对结果" width="120">
        <template slot-scope="{ row }">
          <el-tag :type="row.checkResult === '成功' ? 'success' : 'warning'">
            {{ row.checkResult }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="productTotal" label="产品总数" width="100" />
      <el-table-column prop="mismatchCount" label="不一致数量" width="110" />
      <el-table-column prop="productType" label="产品类型" width="120" />
      <el-table-column label="操作" width="120" fixed="right">
        <template slot-scope="{ row }">
          <el-button type="text" size="mini" @click="openDetailList(row)"> 查看明细 </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 核对明细弹窗 -->
    <el-dialog
      title="核对明细"
      :visible.sync="detailListVisible"
      width="900px"
      :close-on-click-modal="false"
    >
      <!-- 明细查询 -->
      <el-form
        :inline="true"
        :model="detailSearchForm"
        class="search-form"
        label-width="90px"
        size="small"
      >
        <el-form-item label="产品代码">
          <el-input
            v-model="detailSearchForm.productCode"
            placeholder="请输入产品代码"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="核对结果">
          <el-select
            v-model="detailSearchForm.checkResult"
            placeholder="请选择结果"
            clearable
            style="width: 160px"
          >
            <el-option label="一致" value="一致" />
            <el-option label="不一致" value="不一致" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleDetailSearch">查询</el-button>
          <el-button @click="handleDetailReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 明细列表 -->
      <el-table :data="detailTableFiltered" border stripe class="result-table" size="small">
        <el-table-column prop="productCode" label="产品代码" width="120" />
        <el-table-column prop="productName" label="产品名称" min-width="160" />
        <el-table-column prop="checkResult" label="核对结果" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="row.checkResult === '一致' ? 'success' : 'danger'">
              {{ row.checkResult }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="核对开始时间" width="180" />
        <el-table-column prop="endTime" label="核对结束时间" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="openDetailCompare(row)"> 详情 </el-button>
          </template>
        </el-table-column>
      </el-table>

      <span slot="footer" class="dialog-footer">
        <el-button @click="detailListVisible = false">关 闭</el-button>
      </span>
    </el-dialog>

    <!-- 详情对比弹窗：复用手动核对的对比样式 -->
    <el-dialog
      title="产品信息核对详情"
      :visible.sync="detailDialogVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="compare-wrapper">
        <div class="compare-header">
          <div class="compare-title compare-title-left">产品中心</div>
          <div class="compare-title compare-title-right">代销系统</div>
        </div>
        <div class="compare-body">
          <div class="compare-column compare-column-left">
            <div v-for="item in compareItems" :key="`left-${item.key}`" class="compare-row">
              <span class="compare-label">{{ item.label }}</span>
              <span class="compare-value" :class="{ 'is-diff': isDiff(item.key) }">
                {{ currentDetail.productCenter[item.key] || '-' }}
              </span>
            </div>
          </div>
          <div class="compare-divider" />
          <div class="compare-column compare-column-right">
            <div v-for="item in compareItems" :key="`right-${item.key}`" class="compare-row">
              <span class="compare-label">{{ item.label }}</span>
              <span class="compare-value" :class="{ 'is-diff': isDiff(item.key) }">
                {{ currentDetail.agencySystem[item.key] || '-' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="detailDialogVisible = false">关 闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'AutoVerification',
  data() {
    return {
      // 顶层查询
      searchForm: {
        checkTimeRange: [],
        checkResult: '',
      },
      // 模拟自动核对批次数据
      tableData: [
        {
          id: 1,
          startTime: '2026-01-09 09:00:00',
          endTime: '2026-01-09 09:05:00',
          checkResult: '成功',
          productTotal: 100,
          mismatchCount: 0,
          productType: '公募基金',
        },
        {
          id: 2,
          startTime: '2026-01-09 10:00:00',
          endTime: '2026-01-09 10:08:30',
          checkResult: '存在不一致',
          productTotal: 80,
          mismatchCount: 5,
          productType: '理财产品',
        },
      ],
      // 当前选中的批次对应的明细
      detailListVisible: false,
      detailSearchForm: {
        productCode: '',
        checkResult: '',
      },
      detailTableData: [],

      // 详情对比弹窗
      detailDialogVisible: false,
      currentDetail: {
        productCenter: {},
        agencySystem: {},
      },
      compareItems: [
        { label: '产品代码', key: 'productCode' },
        { label: '产品名称', key: 'productName' },
        { label: '产品类型', key: 'productType' },
        { label: '机构代码', key: 'orgCode' },
        { label: '准入状态', key: 'accessStatus' },
        { label: '市场代码', key: 'marketCode' },
        { label: '市场名称', key: 'marketName' },
      ],
    }
  },
  computed: {
    tableDataFiltered() {
      const { checkTimeRange, checkResult } = this.searchForm
      return this.tableData.filter(item => {
        let matchResult = true
        let matchTime = true
        if (checkResult) {
          matchResult = item.checkResult === checkResult
        }
        if (checkTimeRange && checkTimeRange.length === 2) {
          const [start, end] = checkTimeRange
          matchTime = item.startTime >= start && item.endTime <= end
        }
        return matchResult && matchTime
      })
    },
    detailTableFiltered() {
      const { productCode, checkResult } = this.detailSearchForm
      return this.detailTableData.filter(item => {
        const matchCode = productCode ? item.productCode.indexOf(productCode) > -1 : true
        const matchResult = checkResult ? item.checkResult === checkResult : true
        return matchCode && matchResult
      })
    },
  },
  methods: {
    handleSearch() {
      // 使用 computed 过滤即可，这里预留给后续接口调用
    },
    handleReset() {
      this.searchForm.checkTimeRange = []
      this.searchForm.checkResult = ''
    },
    openDetailList(row) {
      // 实际场景下这里根据 row.id 请求明细数据
      // 这里使用模拟数据演示
      this.detailTableData = [
        {
          id: 1,
          productCode: '000001',
          productName: '华夏成长混合',
          checkResult: '不一致',
          startTime: row.startTime,
          endTime: row.endTime,
          productCenter: {
            productCode: '000001',
            productName: '华夏成长混合',
            productType: row.productType,
            orgCode: 'ORG001',
            accessStatus: '已准入',
            marketCode: 'MKT001',
            marketName: '上海证券交易所',
          },
          agencySystem: {
            productCode: '000001',
            productName: '华夏成长混合A',
            productType: row.productType,
            orgCode: 'ORG001',
            accessStatus: '已准入',
            marketCode: 'MKT001',
            marketName: '上交所',
          },
        },
        {
          id: 2,
          productCode: 'LCP123',
          productName: '稳健理财一年期',
          checkResult: '一致',
          startTime: row.startTime,
          endTime: row.endTime,
          productCenter: {
            productCode: 'LCP123',
            productName: '稳健理财一年期',
            productType: row.productType,
            orgCode: 'ORG002',
            accessStatus: '待准入',
            marketCode: 'MKT002',
            marketName: '银行间市场',
          },
          agencySystem: {
            productCode: 'LCP123',
            productName: '稳健理财一年期',
            productType: row.productType,
            orgCode: 'ORG002',
            accessStatus: '待准入',
            marketCode: 'MKT002',
            marketName: '银行间市场',
          },
        },
      ]
      this.detailListVisible = true
    },
    handleDetailSearch() {
      // 使用 computed 过滤即可，这里预留给后续接口调用
    },
    handleDetailReset() {
      this.detailSearchForm.productCode = ''
      this.detailSearchForm.checkResult = ''
    },
    openDetailCompare(row) {
      this.currentDetail = {
        productCenter: row.productCenter || {},
        agencySystem: row.agencySystem || {},
      }
      this.detailDialogVisible = true
    },
    isDiff(key) {
      const left = (this.currentDetail.productCenter || {})[key]
      const right = (this.currentDetail.agencySystem || {})[key]
      return left !== right
    },
  },
}
</script>

<style scoped>
.auto-verification {
  padding: 16px 0;
}

.search-form {
  margin-bottom: 16px;
}

.result-table {
  width: 100%;
}

.compare-wrapper {
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  padding: 16px 24px 8px;
  background-color: #fafbff;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.compare-title {
  font-size: 14px;
  font-weight: 600;
}

.compare-title-left {
  color: #409eff;
}

.compare-title-right {
  color: #67c23a;
}

.compare-body {
  display: flex;
}

.compare-column {
  flex: 1;
}

.compare-column-left {
  padding-right: 16px;
}

.compare-column-right {
  padding-left: 16px;
}

.compare-divider {
  width: 1px;
  background-color: #dcdfe6;
}

.compare-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.compare-label {
  width: 80px;
  font-size: 13px;
  color: #606266;
}

.compare-value {
  flex: 1;
  font-size: 13px;
  color: #303133;
  word-break: break-all;
}

.compare-value.is-diff {
  color: #f56c6c;
  font-weight: 600;
}
</style>
