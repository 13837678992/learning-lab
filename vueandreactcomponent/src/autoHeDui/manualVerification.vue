<template>
  <div class="manual-verification">
    <!-- 查询条件 -->
    <el-form :inline="true" :model="searchForm" class="search-form" label-width="80px" size="small">
      <el-form-item label="产品类型">
        <el-select
          v-model="searchForm.productType"
          placeholder="请选择产品类型"
          clearable
          style="width: 180px"
        >
          <el-option
            v-for="item in productTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="产品代码">
        <el-input
          v-model="searchForm.productCode"
          placeholder="请输入产品代码"
          clearable
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 列表 -->
    <el-table :data="tableDataFiltered" border stripe class="result-table" size="small">
      <el-table-column prop="productType" label="产品类型" width="120" />
      <el-table-column prop="productName" label="产品名称" min-width="160" />
      <el-table-column prop="orgCode" label="机构代码" width="120" />
      <el-table-column prop="accessStatus" label="准入状态" width="100" />
      <el-table-column prop="marketCode" label="市场代码" width="120" />
      <el-table-column prop="marketName" label="市场名称" min-width="120" />
      <el-table-column label="操作" width="100" fixed="right">
        <template slot-scope="{ row }">
          <el-button type="text" size="mini" @click="openDetail(row)"> 详情 </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 详情弹窗：产品中心 vs 代销系统 对比 -->
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
  name: 'ManualVerification',
  data() {
    return {
      // 查询表单
      searchForm: {
        productType: '',
        productCode: '',
      },
      productTypeOptions: [
        { label: '公募基金', value: '公募基金' },
        { label: '私募基金', value: '私募基金' },
        { label: '理财产品', value: '理财产品' },
      ],
      // 模拟列表数据
      tableData: [
        {
          id: 1,
          productType: '公募基金',
          productCode: '000001',
          productName: '华夏成长混合',
          orgCode: 'ORG001',
          accessStatus: '已准入',
          marketCode: 'MKT001',
          marketName: '上海证券交易所',
          // 对比详情数据
          productCenter: {
            productCode: '000001',
            productName: '华夏成长混合',
            productType: '公募基金',
            orgCode: 'ORG001',
            accessStatus: '已准入',
            marketCode: 'MKT001',
            marketName: '上海证券交易所',
          },
          agencySystem: {
            productCode: '000001',
            productName: '华夏成长混合A',
            productType: '公募基金',
            orgCode: 'ORG001',
            accessStatus: '已准入',
            marketCode: 'MKT001',
            marketName: '上交所',
          },
        },
        {
          id: 2,
          productType: '理财产品',
          productCode: 'LCP123',
          productName: '稳健理财一年期',
          orgCode: 'ORG002',
          accessStatus: '待准入',
          marketCode: 'MKT002',
          marketName: '银行间市场',
          productCenter: {
            productCode: 'LCP123',
            productName: '稳健理财一年期',
            productType: '理财产品',
            orgCode: 'ORG002',
            accessStatus: '待准入',
            marketCode: 'MKT002',
            marketName: '银行间市场',
          },
          agencySystem: {
            productCode: 'LCP123',
            productName: '稳健理财一年期',
            productType: '理财产品',
            orgCode: 'ORG002',
            accessStatus: '已准入',
            marketCode: 'MKT002',
            marketName: '银行间市场',
          },
        },
      ],
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
      const { productType, productCode } = this.searchForm
      return this.tableData.filter(item => {
        const matchType = productType ? item.productType === productType : true
        const matchCode = productCode ? item.productCode.indexOf(productCode) > -1 : true
        return matchType && matchCode
      })
    },
  },
  methods: {
    handleSearch() {
      // 由于使用 computed 过滤，这里无需额外逻辑，保留以便后续接入接口
    },
    handleReset() {
      this.searchForm.productType = ''
      this.searchForm.productCode = ''
    },
    openDetail(row) {
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
.manual-verification {
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
