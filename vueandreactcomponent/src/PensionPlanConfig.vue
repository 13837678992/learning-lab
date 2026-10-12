<template>
  <div class="pension-config">
    <!-- ==================== 一、展示页面 ==================== -->
    <div v-if="pageMode === 'list'" class="page-list">
      <!-- 顶部操作区 -->
      <div class="toolbar">
        <el-button type="primary" icon="el-icon-plus" @click="handleCreate">
          新增年龄段配置
        </el-button>
        <div class="toolbar-summary">
          共 <span class="summary-num">{{ ageConfigs.length }}</span> 个年龄段配置，年龄段之间互斥
        </div>
      </div>

      <!-- 年龄段主表格 -->
      <el-card shadow="never" class="panel">
        <el-table
          ref="ageTable"
          :data="ageConfigs"
          row-key="id"
          border
          class="age-table"
          @expand-change="handleExpandChange"
        >
          <!-- 仅用于承载展开明细；图标已隐藏，展开通过自定义图标 / 操作列按钮触发 -->
          <el-table-column type="expand" width="1" class-name="expand-column">
            <template slot-scope="scope">
              <div class="plan-detail">
                <div class="plan-detail-tip">该年龄段下的方案明细（展开查看）</div>
                <el-table :data="scope.row.plans" size="mini" border class="plan-table">
                  <el-table-column label="方案类型" min-width="150">
                    <template slot-scope="planScope">
                      <span :class="planTypeRowClass(planScope.$index)">
                        {{ planTypeLabel(planScope.row.type) }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="适配风险等级" min-width="180">
                    <template slot-scope="planScope">
                      <el-tag
                        v-for="level in planScope.row.riskLevels"
                        :key="level"
                        size="mini"
                        class="risk-tag"
                      >{{ level }}</el-tag>
                      <span v-if="!planScope.row.riskLevels.length" class="text-muted">暂无</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="关联产品" min-width="320" show-overflow-tooltip>
                    <template slot-scope="planScope">
                      <span v-if="planScope.row.products.length">
                        {{ productNamesText(planScope.row) }}
                      </span>
                      <span v-else class="text-muted">暂无关联产品</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="排序" width="80" align="center">
                    <template slot-scope="planScope">{{ planScope.row.sort }}</template>
                  </el-table-column>
                  <el-table-column label="操作" width="90" align="center">
                    <template slot-scope="planScope">
                      <el-button
                        type="text"
                        size="mini"
                        @click="handleEditPlanFromDetail(scope.row, planScope.row)"
                      >编辑</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </template>
          </el-table-column>

          <!-- 适配客户年龄 -->
          <el-table-column label="适配客户年龄" min-width="230">
            <template slot-scope="scope">
              <span class="age-cell" @click="toggleExpand(scope.row)">
                <i
                  class="el-icon-arrow-right age-expand-icon"
                  :class="{ 'is-expanded': isExpanded(scope.row) }"
                ></i>
                <span class="age-range-text">{{ formatAgeRange(scope.row) }}</span>
              </span>
            </template>
          </el-table-column>

          <!-- 方案套数 -->
          <el-table-column label="方案套数" width="120" align="center">
            <template slot-scope="scope">
              <span class="plan-count-text">{{ scope.row.plans.length }} 套</span>
            </template>
          </el-table-column>

          <!-- 状态 -->
          <el-table-column label="状态" width="120">
            <template slot-scope="scope">
              <span class="status-cell">
                <i
                  class="status-dot"
                  :class="scope.row.status === 'enabled' ? 'is-enabled' : 'is-disabled'"
                ></i>
                <span>{{ statusLabel(scope.row.status) }}</span>
              </span>
            </template>
          </el-table-column>

          <!-- 最近更新时间 -->
          <el-table-column label="最近更新时间" width="200">
            <template slot-scope="scope">
              <span class="text-muted">{{ scope.row.updatedAt }}</span>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="270">
            <template slot-scope="scope">
              <el-button type="text" size="mini" @click="toggleExpand(scope.row)">
                {{ isExpanded(scope.row) ? '收起' : '展开' }}
              </el-button>
              <el-button type="text" size="mini" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button
                type="text"
                size="mini"
                :disabled="scope.row.status === 'enabled'"
                @click="handleToggleStatus(scope.row)"
              >{{ scope.row.status === 'enabled' ? '停用' : '启用' }}</el-button>
              <el-button type="text" size="mini" class="danger-text" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- ==================== 二、新增 / 编辑页面 ==================== -->
    <div v-else class="page-edit">
      <div class="edit-header">
        <span class="edit-title">
          {{ editMode === 'create' ? '新增年龄段配置' : '编辑年龄段配置' }}
        </span>
      </div>

      <!-- 校验汇总 -->
      <el-alert
        v-if="saveErrors.length"
        type="error"
        :closable="false"
        show-icon
        class="error-alert"
        title="保存校验未通过，请修正以下问题："
      >
        <ul class="error-list">
          <li v-for="(err, index) in saveErrors" :key="index">{{ err.message }}</li>
        </ul>
      </el-alert>

      <!-- ---------- 模块一：年龄段基础信息 ---------- -->
      <el-card shadow="never" class="panel module-card">
        <div class="module-title">
          <span class="title-bar"></span>年龄段基础信息
        </div>

        <el-alert
          type="info"
          :closable="false"
          class="mutex-alert"
          title="年龄互斥校验：年龄段之间互斥，任一客户年龄只能命中一条年龄配置；保存时校验区间是否重叠，重叠将阻断提交并提示冲突配置。"
        />

        <el-form :model="editForm" label-position="top" class="base-form">
          <!-- 适配客户年龄 -->
          <el-form-item label="适配客户年龄" required class="age-form-item">
            <div class="age-range-input" data-field="age-range">
              <el-input-number
                v-model="editForm.startAge"
                class="age-input"
                :min="18"
                :max="100"
                :precision="0"
                :step-strictly="true"
                :controls="false"
                placeholder="起始年龄"
              />
              <span class="range-sep">-</span>
              <el-input-number
                v-model="editForm.endAge"
                class="age-input"
                :min="18"
                :max="100"
                :precision="0"
                :step-strictly="true"
                :controls="false"
                placeholder="截止年龄"
              />
              <span class="range-unit">周岁</span>
            </div>
            <div class="field-tip">取值 18-100 周岁，截止年龄须大于起始年龄</div>
          </el-form-item>

          <!-- 状态 -->
          <el-form-item label="状态" class="status-form-item">
            <el-switch
              v-model="editForm.status"
              active-value="enabled"
              inactive-value="disabled"
              active-text="启用"
              inactive-text="停用"
            />
            <div class="field-tip">保存后默认停用，需手动启用</div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- ---------- 模块二：方案配置 ---------- -->
      <el-card shadow="never" class="panel module-card">
        <div class="module-title plan-module-title">
          <span class="title-bar"></span>
          <span class="title-text">方案配置</span>
          <span class="title-sub">
            该年龄段下共 {{ editForm.plans.length }} 套方案，可按客户风险等级并行输出
          </span>
          <el-button
            type="primary"
            size="small"
            icon="el-icon-plus"
            class="add-plan-btn"
            @click="handleAddPlan"
          >添加方案</el-button>
        </div>

        <div
          v-for="(plan, planIndex) in editForm.plans"
          :key="plan.id"
          class="plan-card"
          :class="{ 'is-highlight': highlightPlanId === plan.id }"
          :data-plan-id="plan.id"
        >
          <!-- 卡片头部 -->
          <div class="plan-card-header">
            <div class="plan-card-header-left">
              <span class="plan-index">方案 {{ planIndex + 1 }}</span>
              <el-tag size="small" :type="planTypeTagType(plan.type)">
                {{ planTypeLabel(plan.type) }}
              </el-tag>
            </div>
            <el-button
              type="text"
              size="mini"
              class="danger-text"
              :disabled="editForm.plans.length <= 1"
              @click="handleRemovePlan(planIndex)"
            >删除方案</el-button>
          </div>

          <!-- 第一行：基础字段 -->
          <div class="plan-row plan-row-3">
            <div class="plan-field" data-field="plan-name">
              <div class="field-label"><span class="required-mark">*</span>方案名称</div>
              <el-input
                v-model="plan.name"
                size="small"
                maxlength="20"
                placeholder="请输入方案名称（≤20 字）"
              />
            </div>

            <div class="plan-field" data-field="plan-risk">
              <div class="field-label"><span class="required-mark">*</span>适配客户风险等级</div>
              <el-select
                v-model="plan.riskLevels"
                multiple
                collapse-tags
                size="small"
                class="full-width"
                placeholder="请选择风险等级"
                @change="handlePlanRiskChange(plan)"
              >
                <el-option
                  v-for="level in riskLevels"
                  :key="level"
                  :label="level"
                  :value="level"
                />
              </el-select>
              <div class="field-tip">可多选，同一年龄段下不同方案允许交叉</div>
            </div>

            <div class="plan-field" data-field="plan-sort">
              <div class="field-label"><span class="required-mark">*</span>方案排序</div>
              <el-input-number
                v-model="plan.sort"
                class="full-width"
                size="small"
                :min="1"
                :max="999"
                :precision="0"
                :step-strictly="true"
                :controls="false"
                placeholder="请输入正整数"
              />
              <div v-if="planIndex === 0" class="field-tip">数字越小越靠前</div>
            </div>
          </div>

          <!-- 第二行：方案说明 -->
          <div class="plan-row">
            <div class="plan-field" data-field="plan-desc">
              <div class="field-label">
                方案说明
                <el-tag size="mini" type="info" class="optional-tag">非必填</el-tag>
              </div>
              <el-input
                v-model="plan.desc"
                type="textarea"
                :rows="3"
                maxlength="500"
                placeholder="请输入方案说明，用于 APP 展示方案特点（未填写时 APP 不展示该说明）"
              />
              <div class="field-tip desc-tip">
                <span v-if="plan.desc">
                  文本输入，用于 APP 展示方案特点，未填写时 APP 不展示该说明（≤500 字）
                </span>
                <span v-else>
                  示例：未填写 → APP 端该方案不展示说明文字，仅展示方案类型、风险等级与产品信息
                </span>
                <span class="word-count">{{ descLength(plan) }}/500</span>
              </div>
              <div class="product-preview">
                <span class="preview-label">关联产品：</span>
                <span v-if="plan.products.length">{{ productNamesText(plan) }}</span>
                <span v-else class="preview-empty">暂未关联产品，请从产品库添加</span>
              </div>
            </div>
          </div>

          <!-- 第三行：关联产品 -->
          <div class="plan-row">
            <div class="field-label">关联产品</div>
            <div data-field="plan-products">
              <el-table
                :data="plan.products"
                row-key="id"
                size="mini"
                border
                class="product-table"
                :data-product-table-id="plan.id"
                empty-text="该方案暂未关联产品，请点击下方按钮从产品库添加"
              >
                <el-table-column label="产品名称" min-width="240" show-overflow-tooltip>
                  <template slot-scope="scope">
                    <span>{{ scope.row.name }}</span>
                    <el-tooltip
                      v-if="riskMismatchOf(scope.row, plan)"
                      effect="dark"
                      placement="top"
                      :content="riskMismatchOf(scope.row, plan)"
                    >
                      <i class="el-icon-warning-outline risk-mismatch-icon"></i>
                    </el-tooltip>
                  </template>
                </el-table-column>
                <el-table-column label="产品代码" prop="code" width="150" />
                <el-table-column label="风险等级" width="100" align="center">
                  <template slot-scope="scope">
                    <el-tag v-if="scope.row.riskLevel" size="mini">{{ scope.row.riskLevel }}</el-tag>
                    <span v-else class="text-muted">暂无</span>
                  </template>
                </el-table-column>
                <el-table-column label="C 端展示要素" min-width="220" show-overflow-tooltip>
                  <template slot-scope="scope">
                    <span v-if="scope.row.cSide">{{ scope.row.cSide }}</span>
                    <span v-else class="text-muted">暂无</span>
                  </template>
                </el-table-column>
                <el-table-column label="排序" width="96" align="center">
                  <template slot-scope="scope">
                    <el-button
                      type="text"
                      size="mini"
                      icon="el-icon-top"
                      :disabled="scope.$index === 0"
                      @click="moveProduct(plan, scope.$index, -1)"
                    />
                    <el-button
                      type="text"
                      size="mini"
                      icon="el-icon-bottom"
                      :disabled="scope.$index === plan.products.length - 1"
                      @click="moveProduct(plan, scope.$index, 1)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                  <template slot-scope="scope">
                    <el-button
                      type="text"
                      size="mini"
                      class="danger-text"
                      :disabled="plan.products.length <= 1"
                      @click="handleRemoveProduct(plan, scope.$index)"
                    >删除</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="table-footer">
                <el-button
                  type="primary"
                  plain
                  size="small"
                  icon="el-icon-plus"
                  @click="openProductDialog(plan)"
                >从产品库添加产品（支持按产品名称/代码搜索）</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 底部操作区 -->
      <div class="edit-footer">
        <el-button @click="handleCancel">取 消</el-button>
        <el-button type="primary" @click="handleSave">保 存</el-button>
      </div>
    </div>

    <!-- ==================== 三、添加产品弹窗 ==================== -->
    <el-dialog
      title="添加产品"
      :visible.sync="productDialogVisible"
      width="860px"
      :close-on-click-modal="false"
      @closed="handleProductDialogClosed"
    >
      <div class="product-search">
        <el-input
          v-model="productKeyword"
          size="small"
          class="search-input"
          placeholder="请输入产品名称或产品代码搜索"
          prefix-icon="el-icon-search"
          clearable
        />
      </div>

      <el-table
        ref="libraryTable"
        :data="filteredLibrary"
        size="mini"
        border
        height="330"
        highlight-current-row
        empty-text="未找到匹配的产品，请调整搜索关键字"
        @current-change="handleLibrarySelect"
        @row-dblclick="handleLibraryDblClick"
      >
        <el-table-column label="产品名称" prop="name" min-width="260" show-overflow-tooltip />
        <el-table-column label="产品代码" prop="code" width="150" />
        <el-table-column label="产品风险等级" width="110" align="center">
          <template slot-scope="scope">
            <el-tag v-if="scope.row.riskLevel" size="mini">{{ scope.row.riskLevel }}</el-tag>
            <span v-else class="text-muted">暂无</span>
          </template>
        </el-table-column>
        <el-table-column label="C 端展示要素" prop="cSide" min-width="220" show-overflow-tooltip />
      </el-table>

      <div class="dialog-hint">提示：单击选中产品，双击或点击「添加」按钮将产品加入当前方案。</div>

      <span slot="footer" class="dialog-footer">
        <span class="dialog-selected">
          已选择：{{ selectedLibraryProduct ? selectedLibraryProduct.name : '未选择' }}
        </span>
        <el-button size="small" @click="productDialogVisible = false">取 消</el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="!selectedLibraryProduct"
          @click="handleAddSelectedProduct"
        >添 加</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Sortable from 'sortablejs'

/** 风险等级字典（C1-C5） */
const RISK_LEVELS = ['C1', 'C2', 'C3', 'C4', 'C5']

/** 方案类型字典：内部枚举值 -> 中文展示文案 */
const PLAN_TYPES = [
  { value: 'lifelong', label: '终身持续型', tagType: '' },
  { value: 'fixed_term', label: '定期领取型', tagType: 'success' },
  { value: 'high_payout', label: '高领取型', tagType: 'warning' },
  { value: 'steady_growth', label: '稳健增值型', tagType: 'info' },
  { value: 'flexible', label: '灵活给付型', tagType: 'danger' },
]

/**
 * 产品库（模拟数据）。与方案中已关联的产品分开管理，
 * 方案中保存的是产品快照，通过 id / code 与产品库关联。
 */
const PRODUCT_LIBRARY = [
  { id: 'P001', name: '中宏宏享人生无忧版养老金保险（分红型）', code: 'ZH-YL-001', riskLevel: 'C2', cSide: '终身领取，含分红权益，第 5 年起可领取' },
  { id: 'P002', name: '嘉实养老 2030 三年持有期混合（FOF）A', code: 'JS-YL-2030', riskLevel: 'C3', cSide: '目标日期策略，权益仓位随年龄递减' },
  { id: 'P003', name: '中欧养老产业混合 A', code: 'ZO-YL-001', riskLevel: 'C4', cSide: '聚焦养老产业主题，波动相对较高' },
  { id: 'P004', name: '华夏养老目标日期 2045 三年持有混合（FOF）', code: 'HX-2045', riskLevel: 'C3', cSide: '下滑轨道设计，适合中长期持有' },
  { id: 'P005', name: '招商和悦稳健养老一年持有混合（FOF）A', code: 'ZS-YY-001', riskLevel: 'C2', cSide: '固收打底，一年持有期' },
  { id: 'P006', name: '平安聚财宝年金保险（万能型）', code: 'PA-NJ-002', riskLevel: 'C1', cSide: '保底利率结算，可月领可年领' },
  { id: 'P007', name: '国民养老稳健添利专属商业养老保险', code: 'GM-YL-003', riskLevel: 'C1', cSide: '稳健账户 + 进取账户双账户可选' },
  { id: 'P008', name: '泰康岁月有约养老年金保险', code: 'TK-YL-004', riskLevel: '', cSide: '养老年金按年给付，含长期护理责任' },
  { id: 'P009', name: '广发稳健增长混合 A', code: 'GF-WJ-001', riskLevel: 'C4', cSide: '权益仓位较高，力争长期资本增值' },
  { id: 'P010', name: '易方达裕祥回报债券 A', code: 'YFD-YX-001', riskLevel: 'C2', cSide: '以中高等级信用债为主，回撤相对可控' },
  { id: 'P011', name: '南方安裕混合 A', code: 'NF-AY-001', riskLevel: 'C5', cSide: '攻守兼备，权益仓位弹性较大' },
  { id: 'P012', name: '工银瑞信添颐债券 B', code: 'GY-TY-002', riskLevel: '', cSide: '纯债策略，不含权益资产' },
  { id: 'P013', name: '富国天利增长债券 LOF', code: 'FG-TL-001', riskLevel: 'C3', cSide: '一级债基，参与打新增强收益' },
]

/**
 * 初始年龄段配置（模拟主数据）。
 * 年龄段互斥：18-30 / 31-40 / 41-50 / 51-60，互不重叠。
 */
const INITIAL_AGE_CONFIGS = [
  {
    id: 'age-1',
    startAge: 18,
    endAge: 30,
    status: 'enabled',
    updatedAt: '2026-09-18 09:24',
    plans: [
      {
        id: 'plan-1-1',
        name: '青年稳健增值方案',
        type: 'steady_growth',
        riskLevels: ['C1', 'C2'],
        sort: 1,
        desc: '面向 18-30 周岁客户，以长期稳健增值为目标，配置养老目标基金与专属商业养老保险。',
        products: ['GM-YL-003', 'YFD-YX-001'],
      },
    ],
  },
  {
    id: 'age-2',
    startAge: 31,
    endAge: 40,
    status: 'enabled',
    updatedAt: '2026-09-25 14:06',
    plans: [
      {
        id: 'plan-2-1',
        name: '中坚成长进取方案',
        type: 'high_payout',
        riskLevels: ['C3', 'C4'],
        sort: 1,
        desc: '收入上升期，适度提升权益仓位，兼顾增值与养老储备。',
        products: ['HX-2045', 'GF-WJ-001'],
      },
      {
        id: 'plan-2-2',
        name: '中坚稳健打底方案',
        type: 'fixed_term',
        riskLevels: ['C1', 'C2'],
        sort: 2,
        desc: '以固收类产品打底，控制回撤，作为养老储备的稳健底仓。',
        products: ['ZS-YY-001'],
      },
    ],
  },
  {
    id: 'age-3',
    startAge: 41,
    endAge: 50,
    status: 'disabled',
    updatedAt: '2026-08-30 17:42',
    plans: [
      {
        id: 'plan-3-1',
        name: '过渡期资产再平衡方案',
        type: 'flexible',
        riskLevels: ['C2', 'C3'],
        sort: 1,
        desc: '临近退休前的过渡期，逐步降低权益仓位，提升组合稳定性。',
        products: ['FG-TL-001', 'GY-TY-002'],
      },
    ],
  },
  {
    id: 'age-4',
    startAge: 51,
    endAge: 60,
    status: 'enabled',
    updatedAt: '2026-10-08 10:12',
    plans: [
      {
        id: 'plan-4-1',
        name: '临近退休终身领取方案',
        type: 'lifelong',
        riskLevels: ['C1', 'C2'],
        sort: 1,
        desc: '以终身领取型年金为主，锁定长期现金流，适配临近退休客户的确定性需求。',
        products: ['ZH-YL-001', 'PA-NJ-002'],
      },
      {
        id: 'plan-4-2',
        name: '临近退休稳健过渡方案',
        type: 'fixed_term',
        riskLevels: ['C1', 'C2'],
        sort: 2,
        desc: '固收 + 目标日期组合，兼顾流动性与稳健收益，可按年领取。',
        // GF-WJ-001 风险等级为 C4，不在本方案 C1/C2 范围内 -> 页面展示风险不匹配提醒（非阻断）
        products: ['ZS-YY-001', 'GF-WJ-001'],
      },
      {
        id: 'plan-4-3',
        name: '临近退休灵活给付方案',
        type: 'flexible',
        riskLevels: ['C3'],
        sort: 3,
        desc: '',
        products: ['HX-2045', 'TK-YL-004'],
      },
    ],
  },
]

/** 深拷贝工具：保证编辑态与主数据彻底隔离 */
function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

/** 从产品库取一份产品快照（不共享引用）；key 支持产品 ID 或产品代码 */
function pickLibraryProduct(key) {
  const found = PRODUCT_LIBRARY.find(item => item.id === key || item.code === key)
  if (!found) return null
  return {
    id: found.id,
    name: found.name,
    code: found.code,
    riskLevel: found.riskLevel,
    cSide: found.cSide,
  }
}

/** 把产品库代码数组转换为产品快照数组 */
function useProducts(codes) {
  return codes.map(pickLibraryProduct).filter(Boolean)
}

/** 构建一份全新的初始主数据（每次挂载互不影响） */
function buildInitialAgeConfigs() {
  return INITIAL_AGE_CONFIGS.map(config => {
    const copy = deepClone(config)
    copy.plans = copy.plans.map(plan => {
      plan.products = useProducts(plan.products)
      return plan
    })
    return copy
  })
}

export default {
  name: 'PensionPlanConfig',
  data() {
    return {
      // ---------- 字典 ----------
      riskLevels: RISK_LEVELS,
      planTypes: PLAN_TYPES,
      productLibrary: deepClone(PRODUCT_LIBRARY),

      // ---------- 主数据 ----------
      ageConfigs: buildInitialAgeConfigs(),

      // ---------- 页面状态 ----------
      pageMode: 'list', // list | edit
      editMode: 'create', // create | update
      editingId: null,
      editForm: null,
      expandedKeys: [],
      highlightPlanId: '',
      highlightTimer: null,
      flashTimers: [],
      saveErrors: [],

      // ---------- ID 自增序列（避免随机值导致 ID 不稳定） ----------
      ageSeq: 100,
      planSeq: 1000,

      // ---------- 添加产品弹窗 ----------
      productDialogVisible: false,
      productDialogPlanId: null,
      productKeyword: '',
      selectedLibraryProduct: null,

      // ---------- 拖拽实例 ----------
      sortables: [],
    }
  },

  computed: {
    /** 弹窗内按关键字过滤后的产品库（名称 / 代码模糊匹配，不区分大小写） */
    filteredLibrary() {
      const keyword = (this.productKeyword || '').trim().toLowerCase()
      if (!keyword) return this.productLibrary
      return this.productLibrary.filter(item => {
        return (
          String(item.name).toLowerCase().indexOf(keyword) !== -1 ||
          String(item.code).toLowerCase().indexOf(keyword) !== -1
        )
      })
    },
  },

  beforeDestroy() {
    this.destroySortables()
    this.clearHighlightTimer()
    this.clearFlashTimers()
  },

  methods: {
    /* ==================== 字典相关 ==================== */

    planTypeLabel(type) {
      const found = PLAN_TYPES.find(item => item.value === type)
      return found ? found.label : '未知类型'
    },

    planTypeTagType(type) {
      const found = PLAN_TYPES.find(item => item.value === type)
      return found ? found.tagType : 'info'
    },

    isValidPlanType(type) {
      return PLAN_TYPES.some(item => item.value === type)
    },

    statusLabel(status) {
      return status === 'enabled' ? '启用' : '停用'
    },

    /** 方案明细「方案类型」列的奇偶行样式：奇数行蓝紫色，偶数行绿色 */
    planTypeRowClass(index) {
      return (index + 1) % 2 === 1 ? 'plan-type-odd' : 'plan-type-even'
    },

    formatAgeRange(config) {
      return `${config.startAge}-${config.endAge} 周岁`
    },

    productNamesText(plan) {
      return plan.products.map(item => item.name).join('、')
    },

    descLength(plan) {
      return (plan.desc || '').length
    },

    /** 统一的时间格式：YYYY-MM-DD HH:mm */
    formatNow() {
      const date = new Date()
      const pad = value => String(value).padStart(2, '0')
      return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
      )
    },

    /* ==================== 展开 / 收起 ==================== */

    isExpanded(row) {
      return this.expandedKeys.indexOf(row.id) !== -1
    },

    /**
     * 展开 / 收起。自定义图标与操作列按钮共用此方法，
     * 状态由表格自身维护，再通过 expand-change 同步回 expandedKeys。
     */
    toggleExpand(row) {
      const table = this.$refs.ageTable
      if (!table) return
      table.toggleRowExpansion(row)
    },

    handleExpandChange(row, expandedRows) {
      this.expandedKeys = (expandedRows || []).map(item => item.id)
    },

    /* ==================== 展示页：新增 / 编辑 / 启停 / 删除 ==================== */

    handleCreate() {
      this.startEdit(null, 'create')
    },

    handleEdit(config) {
      this.startEdit(config, 'update')
    },

    startEdit(config, mode) {
      this.editMode = mode
      this.editingId = config ? config.id : null
      this.saveErrors = []

      if (mode === 'update' && config) {
        // 编辑：使用独立副本，取消后不影响主数据
        const copy = deepClone(config)
        this.editForm = {
          id: copy.id,
          startAge: copy.startAge,
          endAge: copy.endAge,
          status: copy.status,
          updatedAt: copy.updatedAt,
          plans: copy.plans,
        }
      } else {
        this.planSeq += 1
        this.editForm = {
          id: null,
          startAge: null,
          endAge: null,
          status: 'disabled', // 新增默认停用
          updatedAt: '',
          plans: [this.createEmptyPlan(1, 0)],
        }
      }

      this.enterEditPage()
    },

    /** 从方案明细进入编辑页，并定位 / 高亮目标方案卡片 */
    handleEditPlanFromDetail(config, plan) {
      this.startEdit(config, 'update')
      const planId = plan.id
      this.$nextTick(() => {
        this.focusPlanCard(planId)
      })
    },

    enterEditPage() {
      this.pageMode = 'edit'
      this.$nextTick(() => {
        this.initSortables()
      })
    },

    /** 滚动到目标方案卡片并短暂高亮；方案不存在时给出提示 */
    focusPlanCard(planId) {
      const card = this.$el.querySelector(`[data-plan-id="${planId}"]`)
      if (!card) {
        this.$message.info('目标方案已不存在，已进入编辑页面')
        return
      }
      try {
        card.scrollIntoView({ block: 'center', behavior: 'smooth' })
      } catch (error) {
        card.scrollIntoView()
      }
      this.flashPlan(planId)
    },

    flashPlan(planId) {
      this.highlightPlanId = planId
      this.clearHighlightTimer()
      this.highlightTimer = setTimeout(() => {
        this.highlightPlanId = ''
        this.highlightTimer = null
      }, 2000)
    },

    clearHighlightTimer() {
      if (this.highlightTimer) {
        clearTimeout(this.highlightTimer)
        this.highlightTimer = null
      }
    },

    clearFlashTimers() {
      this.flashTimers.forEach(timer => clearTimeout(timer))
      this.flashTimers = []
    },

    /** 切换启用 / 停用；启用状态下按钮已 disabled，此处只处理「停用 -> 启用」 */
    handleToggleStatus(row) {
      if (row.status === 'enabled') return
      row.status = 'enabled'
      row.updatedAt = this.formatNow()
      this.$message.success(`已启用「${this.formatAgeRange(row)}」年龄段配置`)
    },

    /** 删除年龄段配置（二次确认 + 级联删除方案与产品） */
    handleDelete(row) {
      const planCount = row.plans.length
      this.$confirm(
        `确认删除「${this.formatAgeRange(row)}」年龄段配置吗？该配置下的 ${planCount} 套方案及关联产品将一并删除。`,
        '删除确认',
        {
          type: 'warning',
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
        }
      )
        .then(() => {
          const index = this.ageConfigs.findIndex(item => item.id === row.id)
          if (index === -1) return
          this.ageConfigs.splice(index, 1)
          this.expandedKeys = this.expandedKeys.filter(key => key !== row.id)
          this.$message.success('删除成功')
        })
        .catch(() => {})
    },

    /* ==================== 编辑页：方案增删 ==================== */

    createEmptyPlan(sort, typeIndex) {
      this.planSeq += 1
      const type = PLAN_TYPES[typeIndex % PLAN_TYPES.length].value
      return {
        id: `plan-new-${this.planSeq}`,
        name: '',
        type,
        riskLevels: [],
        sort,
        desc: '',
        products: [],
      }
    },

    handleAddPlan() {
      const plans = this.editForm.plans
      const maxSort = plans.reduce((max, plan) => {
        const value = Number(plan.sort)
        return !isNaN(value) && value > max ? value : max
      }, 0)
      plans.push(this.createEmptyPlan(maxSort + 1, plans.length))
      this.$nextTick(() => {
        this.initSortables()
      })
    },

    handleRemovePlan(index) {
      if (this.editForm.plans.length <= 1) {
        this.$message.warning('每个年龄段至少保留一个方案')
        return
      }
      const plan = this.editForm.plans[index]
      const planLabel = plan && plan.name ? `「${plan.name}」` : `「方案 ${index + 1}」`
      this.$confirm(`确认删除${planLabel}及其关联产品吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      })
        .then(() => {
          this.editForm.plans.splice(index, 1)
          this.$message.success('方案已删除')
          this.$nextTick(() => {
            this.initSortables()
          })
        })
        .catch(() => {})
    },

    /* ==================== 编辑页：关联产品 ==================== */

    moveProduct(plan, index, offset) {
      const target = index + offset
      if (target < 0 || target >= plan.products.length) return
      const moved = plan.products.splice(index, 1)[0]
      plan.products.splice(target, 0, moved)
    },

    handleRemoveProduct(plan, index) {
      if (plan.products.length <= 1) {
        this.$message.warning('每个方案至少关联一个产品，如需调整请先添加其他产品')
        return
      }
      const product = plan.products[index]
      this.$confirm(`确认从当前方案中移除产品「${product.name}」吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      })
        .then(() => {
          plan.products.splice(index, 1)
          this.$message.success('产品已移除')
        })
        .catch(() => {})
    },

    /* ==================== 风险等级匹配（统一封装） ==================== */

    /**
     * 风险等级匹配提醒（提醒逻辑，非阻断规则）。
     * 返回空字符串表示不提示：
     *  - 方案未选择任何风险等级
     *  - 产品没有风险等级
     *  - 产品风险等级属于方案所选范围
     */
    getRiskMismatch(product, plan) {
      const planLevels = plan.riskLevels || []
      if (!planLevels.length) return ''
      if (!product.riskLevel) return ''
      if (planLevels.indexOf(product.riskLevel) !== -1) return ''
      return (
        `产品「${product.name}」风险等级为 ${product.riskLevel}，` +
        `不在当前方案适配的风险等级（${planLevels.join('、')}）范围内`
      )
    },

    /** 模板内使用的风险不匹配文案 */
    riskMismatchOf(product, plan) {
      return this.getRiskMismatch(product, plan)
    },

    /** 方案风险等级变更后，重新检查该方案下所有已关联产品（不阻断、不自动删除） */
    handlePlanRiskChange(plan) {
      const mismatched = plan.products.filter(product => this.getRiskMismatch(product, plan))
      if (mismatched.length) {
        this.$message.warning(
          `方案「${plan.name || '未命名方案'}」下有 ${mismatched.length} 个产品的风险等级不在所选范围内，请确认`
        )
      }
    },

    /* ==================== 添加产品弹窗 ==================== */

    findPlanById(planId) {
      if (!this.editForm) return null
      return this.editForm.plans.find(plan => plan.id === planId) || null
    },

    openProductDialog(plan) {
      this.productDialogPlanId = plan.id
      this.productKeyword = ''
      this.selectedLibraryProduct = null
      this.productDialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.libraryTable) this.$refs.libraryTable.setCurrentRow(null)
      })
    },

    handleProductDialogClosed() {
      this.productKeyword = ''
      this.selectedLibraryProduct = null
      this.productDialogPlanId = null
    },

    handleLibrarySelect(row) {
      this.selectedLibraryProduct = row || null
    },

    handleLibraryDblClick(row) {
      this.selectedLibraryProduct = row
      this.addProductToPlan(row)
    },

    handleAddSelectedProduct() {
      if (!this.selectedLibraryProduct) {
        this.$message.warning('请先选择需要添加的产品')
        return
      }
      this.addProductToPlan(this.selectedLibraryProduct)
    },

    /** 将产品加入当前方案：去重 -> 更新列表 -> 重新计算预览 -> 检查风险等级 */
    addProductToPlan(libraryProduct) {
      const plan = this.findPlanById(this.productDialogPlanId)
      if (!plan) {
        this.$message.error('当前方案已不存在，请重新打开弹窗')
        this.productDialogVisible = false
        return
      }

      // 以产品 ID 判断唯一性（不依赖产品名称）
      const exists = plan.products.some(product => product.id === libraryProduct.id)
      if (exists) {
        this.$message.warning(`产品「${libraryProduct.name}」已关联到当前方案，请勿重复添加`)
        return
      }

      // 加入产品快照，与产品库解耦
      plan.products.push({
        id: libraryProduct.id,
        name: libraryProduct.name,
        code: libraryProduct.code,
        riskLevel: libraryProduct.riskLevel,
        cSide: libraryProduct.cSide,
      })

      // 清空选中状态，便于连续添加
      this.selectedLibraryProduct = null
      if (this.$refs.libraryTable) this.$refs.libraryTable.setCurrentRow(null)

      const mismatch = this.getRiskMismatch(libraryProduct, plan)
      if (mismatch) {
        this.$message.warning(`已添加，但风险等级不匹配：${mismatch}`)
      } else {
        this.$message.success(`产品「${libraryProduct.name}」已添加`)
      }
    },

    /* ==================== 拖拽排序 ==================== */

    initSortables() {
      this.destroySortables()
      if (this.pageMode !== 'edit') return
      this.$nextTick(() => {
        const tables = this.$el.querySelectorAll('.product-table')
        Array.prototype.forEach.call(tables, tableEl => {
          const tbody = tableEl.querySelector('.el-table__body-wrapper tbody')
          if (!tbody) return
          const planId = tableEl.getAttribute('data-product-table-id')
          const plan = this.findPlanById(planId)
          if (!plan) return

          const sortable = Sortable.create(tbody, {
            animation: 150,
            draggable: 'tr', // 仅表格行可拖拽，避免表内其它节点成为拖拽目标
            ghostClass: 'drag-ghost',
            onEnd: event => {
              const oldIndex = event.oldIndex
              const newIndex = event.newIndex
              if (
                oldIndex === undefined ||
                newIndex === undefined ||
                oldIndex === newIndex ||
                oldIndex < 0 ||
                newIndex < 0
              ) {
                return
              }
              // 与上移 / 下移按钮操作同一个产品数组
              const moved = plan.products.splice(oldIndex, 1)[0]
              plan.products.splice(newIndex, 0, moved)
            },
          })
          this.sortables.push(sortable)
        })
      })
    },

    destroySortables() {
      this.sortables.forEach(instance => {
        if (instance && instance.destroy) instance.destroy()
      })
      this.sortables = []
    },

    /* ==================== 校验 ==================== */

    /** 整数闭区间重叠判定：a <= d && c <= b */
    isRangeOverlap(startA, endA, startB, endB) {
      return startA <= endB && startB <= endA
    },

    isValidAge(value) {
      if (value === null || value === undefined || value === '') return false
      const num = Number(value)
      return !isNaN(num) && num >= 18 && num <= 100
    },

    /** 查找与待保存区间冲突的年龄段（含停用项，编辑时排除自身） */
    findAgeConflict(startAge, endAge) {
      const start = Number(startAge)
      const end = Number(endAge)
      return (
        this.ageConfigs.find(config => {
          if (this.editMode === 'update' && config.id === this.editingId) return false
          return this.isRangeOverlap(start, end, config.startAge, config.endAge)
        }) || null
      )
    },

    /** 收集全部阻断型校验错误（含定位信息） */
    collectSaveErrors() {
      const errors = []
      const form = this.editForm

      /* ---- 年龄段基础信息 ---- */
      const ageSelector = '[data-field="age-range"]'
      const hasStart = form.startAge !== null && form.startAge !== undefined && form.startAge !== ''
      const hasEnd = form.endAge !== null && form.endAge !== undefined && form.endAge !== ''

      if (!hasStart) {
        errors.push({ message: '请填写起始年龄', selector: ageSelector })
      }
      if (!hasEnd) {
        errors.push({ message: '请填写截止年龄', selector: ageSelector })
      }

      if (hasStart && hasEnd) {
        if (!this.isValidAge(form.startAge) || !this.isValidAge(form.endAge)) {
          errors.push({ message: '年龄取值范围为 18-100 周岁', selector: ageSelector })
        } else if (Number(form.endAge) <= Number(form.startAge)) {
          errors.push({ message: '截止年龄必须大于起始年龄', selector: ageSelector })
        } else {
          const conflict = this.findAgeConflict(form.startAge, form.endAge)
          if (conflict) {
            errors.push({
              message:
                `年龄区间 ${form.startAge}-${form.endAge} 周岁与已存在的` +
                `「${this.formatAgeRange(conflict)}」区间重叠，同一客户年龄只能命中一条配置`,
              selector: ageSelector,
            })
          }
        }
      }

      /* ---- 方案集合 ---- */
      if (!form.plans.length) {
        errors.push({ message: '每个年龄段至少需要配置一个方案', selector: '.plan-card' })
      }

      form.plans.forEach((plan, index) => {
        const label = `方案 ${index + 1}`
        const cardSelector = `[data-plan-id="${plan.id}"]`
        const name = typeof plan.name === 'string' ? plan.name.trim() : ''

        if (!name) {
          errors.push({
            message: `${label}：方案名称不能为空`,
            selector: `${cardSelector} [data-field="plan-name"]`,
            planId: plan.id,
          })
        } else if (name.length > 20) {
          errors.push({
            message: `${label}：方案名称最多 20 个字符`,
            selector: `${cardSelector} [data-field="plan-name"]`,
            planId: plan.id,
          })
        }

        if (!plan.riskLevels || !plan.riskLevels.length) {
          errors.push({
            message: `${label}：请至少选择一个适配客户风险等级`,
            selector: `${cardSelector} [data-field="plan-risk"]`,
            planId: plan.id,
          })
        }

        const sortValue = plan.sort
        const hasSort = sortValue !== null && sortValue !== undefined && sortValue !== ''
        if (!hasSort || isNaN(Number(sortValue)) || !Number.isInteger(Number(sortValue)) || Number(sortValue) <= 0) {
          errors.push({
            message: `${label}：方案排序必须为正整数`,
            selector: `${cardSelector} [data-field="plan-sort"]`,
            planId: plan.id,
          })
        }

        if (plan.desc && String(plan.desc).length > 500) {
          errors.push({
            message: `${label}：方案说明最多 500 个字符`,
            selector: `${cardSelector} [data-field="plan-desc"]`,
            planId: plan.id,
          })
        }

        if (!this.isValidPlanType(plan.type)) {
          errors.push({
            message: `${label}：方案类型不合法`,
            selector: `${cardSelector}`,
            planId: plan.id,
          })
        }

        if (!plan.products || !plan.products.length) {
          errors.push({
            message: `${label}：至少需要关联一个产品`,
            selector: `${cardSelector} [data-field="plan-products"]`,
            planId: plan.id,
          })
        } else {
          const seen = {}
          let duplicated = null
          plan.products.forEach(product => {
            if (seen[product.id] && !duplicated) duplicated = product
            seen[product.id] = true
          })
          if (duplicated) {
            errors.push({
              message: `${label}：产品「${duplicated.name}」重复关联，同一方案不能重复添加相同产品`,
              selector: `${cardSelector} [data-field="plan-products"]`,
              planId: plan.id,
            })
          }
        }
      })

      /* ---- 方案排序值重复 ---- */
      const sortIndexMap = {}
      form.plans.forEach((plan, index) => {
        const hasSort = plan.sort !== null && plan.sort !== undefined && plan.sort !== ''
        if (!hasSort) return
        const key = String(plan.sort)
        if (sortIndexMap[key] !== undefined) {
          errors.push({
            message:
              `方案 ${sortIndexMap[key] + 1} 与 方案 ${index + 1} 的方案排序值重复` +
              `（均为 ${plan.sort}），同一年龄段内排序值不能重复`,
            selector: `[data-plan-id="${plan.id}"] [data-field="plan-sort"]`,
            planId: plan.id,
          })
        } else {
          sortIndexMap[key] = index
        }
      })

      return errors
    },

    /** 定位错误：展开方案 -> 滚动 -> 聚焦 -> 短暂高亮 */
    locateError(error) {
      this.$nextTick(() => {
        if (error.planId) {
          this.flashPlan(error.planId)
        }

        const target = this.$el.querySelector(error.selector)
        if (!target) return

        try {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } catch (err) {
          target.scrollIntoView()
        }

        const focusable = target.matches && target.matches('input, textarea')
          ? target
          : target.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])')

        if (focusable && typeof focusable.focus === 'function') {
          try {
            focusable.focus({ preventScroll: true })
          } catch (err) {
            focusable.focus()
          }
        }

        this.flashElement(target)
      })
    },

    /** 对错误区域做短暂视觉高亮 */
    flashElement(element) {
      if (!element || !element.classList) return
      element.classList.add('field-flash')
      const timer = setTimeout(() => {
        element.classList.remove('field-flash')
        const index = this.flashTimers.indexOf(timer)
        if (index !== -1) this.flashTimers.splice(index, 1)
      }, 1800)
      this.flashTimers.push(timer)
    },

    /* ==================== 保存 / 取消 ==================== */

    handleSave() {
      const errors = this.collectSaveErrors()
      this.saveErrors = errors

      if (errors.length) {
        this.$message.error(
          `保存失败：${errors[0].message}（共 ${errors.length} 处问题，请按提示修正）`
        )
        this.locateError(errors[0])
        return
      }

      const now = this.formatNow()

      if (this.editMode === 'create') {
        this.ageSeq += 1
        this.ageConfigs.push({
          id: `age-${this.ageSeq}`,
          startAge: Number(this.editForm.startAge),
          endAge: Number(this.editForm.endAge),
          status: this.editForm.status,
          updatedAt: now,
          plans: this.editForm.plans,
        })
      } else {
        const index = this.ageConfigs.findIndex(config => config.id === this.editingId)
        if (index === -1) {
          this.$message.error('待编辑的年龄段配置已不存在，请返回列表重试')
          return
        }
        this.ageConfigs.splice(index, 1, {
          id: this.editingId,
          startAge: Number(this.editForm.startAge),
          endAge: Number(this.editForm.endAge),
          status: this.editForm.status,
          updatedAt: now,
          plans: this.editForm.plans,
        })
      }

      this.exitEditPage()
      this.$message.success('保存成功')
    },

    /** 取消编辑：直接返回展示页，不保存本次编辑（编辑数据为副本，主数据不受影响） */
    handleCancel() {
      this.exitEditPage()
      this.$message.info('已取消本次编辑')
    },

    exitEditPage() {
      this.destroySortables()
      this.clearHighlightTimer()
      this.clearFlashTimers()
      this.editForm = null
      this.editingId = null
      this.saveErrors = []
      this.pageMode = 'list'
    },
  },
}
</script>

<style scoped>
.pension-config {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px 24px 40px;
  background-color: #f5f7fa;
  color: #303133;
  font-size: 14px;
}

.panel {
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

/* ==================== 顶部操作区 ==================== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-summary {
  color: #606266;
  font-size: 13px;
}

.summary-num {
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
  padding: 0 2px;
}

/* ==================== 年龄段主表格 ==================== */
.age-table {
  width: 100%;
}

/* 展开明细的承载列：隐藏 Element 自带箭头，改用自定义图标 */
.age-table ::v-deep .expand-column .cell {
  padding: 0;
  overflow: hidden;
}

.age-table ::v-deep .expand-column .el-table__expand-icon {
  display: none;
}

.age-table ::v-deep .el-table__expanded-cell {
  padding: 0 !important;
  background-color: #f0f2f5;
}

.age-cell {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.age-expand-icon {
  margin-right: 8px;
  color: #909399;
  font-size: 14px;
  transition: transform 0.2s ease;
}

.age-expand-icon.is-expanded {
  transform: rotate(90deg);
  color: #409eff;
}

.age-range-text {
  font-weight: 600;
  color: #303133;
}

.plan-count-text {
  color: #409eff;
  font-weight: 600;
}

.status-cell {
  display: inline-flex;
  align-items: center;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
}

.status-dot.is-enabled {
  background-color: #67c23a;
}

.status-dot.is-disabled {
  background-color: #c0c4cc;
}

.text-muted {
  color: #909399;
  font-size: 13px;
}

.danger-text {
  color: #f56c6c;
}

.danger-text.is-disabled,
.danger-text[disabled] {
  color: #c0c4cc;
}

/* ==================== 展开明细 ==================== */
.plan-detail {
  padding: 14px 20px 18px;
  background-color: #f0f2f5;
}

.plan-detail-tip {
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  color: #606266;
  font-size: 13px;
}

.plan-table {
  background-color: #fff;
}

.plan-type-odd {
  color: #6f42c1;
  font-weight: 600;
}

.plan-type-even {
  color: #2e9e44;
  font-weight: 600;
}

.risk-tag {
  margin-right: 6px;
}

.risk-tag:last-child {
  margin-right: 0;
}

/* ==================== 编辑页 ==================== */
.edit-header {
  margin-bottom: 16px;
}

.edit-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.error-alert {
  margin-bottom: 16px;
}

.error-list {
  margin: 4px 0 0;
  padding-left: 18px;
  line-height: 22px;
}

.module-card {
  margin-bottom: 16px;
  padding: 4px 0;
}

.module-title {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.title-bar {
  display: inline-block;
  width: 4px;
  height: 16px;
  margin-right: 8px;
  background-color: #409eff;
  border-radius: 2px;
}

.plan-module-title {
  flex-wrap: wrap;
}

.title-text {
  margin-right: 10px;
}

.title-sub {
  flex: 1;
  color: #909399;
  font-size: 13px;
  font-weight: 400;
}

.add-plan-btn {
  flex-shrink: 0;
}

.mutex-alert {
  margin-bottom: 18px;
}

/* ==================== 基础信息 ==================== */
.base-form {
  max-width: 920px;
}

.age-form-item {
  margin-bottom: 8px;
}

/* 校验失败时被定位到的区域短暂高亮 */
.field-flash {
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.45);
}

.age-range-input {
  display: flex;
  align-items: center;
}

.age-input {
  width: 140px;
}

.range-sep {
  margin: 0 10px;
  color: #909399;
}

.range-unit {
  margin-left: 10px;
  color: #606266;
}

.status-form-item {
  margin-bottom: 0;
}

.field-tip {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}

/* ==================== 方案卡片 ==================== */
.plan-card {
  margin-bottom: 16px;
  padding: 16px 18px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fff;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.plan-card:last-child {
  margin-bottom: 0;
}

.plan-card.is-highlight {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.25);
}

.plan-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px dashed #ebeef5;
}

.plan-card-header-left {
  display: flex;
  align-items: center;
}

.plan-index {
  margin-right: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.plan-row {
  margin-bottom: 16px;
}

.plan-row:last-child {
  margin-bottom: 0;
}

.plan-row-3 {
  display: flex;
  flex-wrap: wrap;
  margin-left: -12px;
  margin-right: -12px;
}

.plan-row-3 .plan-field {
  flex: 1 1 0;
  min-width: 220px;
  padding: 0 12px;
  box-sizing: border-box;
}

.plan-field {
  position: relative;
  border-radius: 4px;
}

.field-label {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
}

.required-mark {
  margin-right: 2px;
  color: #f56c6c;
}

.optional-tag {
  margin-left: 6px;
}

.full-width {
  width: 100%;
}

.desc-tip {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.word-count {
  flex-shrink: 0;
  margin-left: 12px;
  color: #c0c4cc;
}

.product-preview {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;
  color: #303133;
  word-break: break-all;
}

.preview-label {
  color: #909399;
}

.preview-empty {
  color: #c0c4cc;
}

/* ==================== 关联产品表格 ==================== */
.product-table {
  width: 100%;
}

.product-table ::v-deep .el-table__row {
  cursor: move;
}

.product-table ::v-deep .drag-ghost {
  opacity: 0.6;
  background-color: #ecf5ff !important;
}

.risk-mismatch-icon {
  margin-left: 6px;
  color: #e6a23c;
  cursor: help;
}

.table-footer {
  margin-top: 10px;
}

/* ==================== 底部操作区 ==================== */
.edit-footer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  margin-top: 16px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

/* ==================== 添加产品弹窗 ==================== */
.product-search {
  margin-bottom: 12px;
}

.search-input {
  width: 320px;
}

.dialog-hint {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.dialog-selected {
  flex: 1;
  overflow: hidden;
  color: #909399;
  font-size: 12px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
