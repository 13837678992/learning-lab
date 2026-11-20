<template>
  <main class="msr-page" v-loading="pageLoading" element-loading-text="正在加载报告…">
    <div class="msr-container">
      <template v-if="currentView === 'list'">
        <header class="msr-page-header">
          <div>
            <h1>月度策略报告</h1>
          </div>
          <el-button
            type="primary"
            icon="el-icon-upload2"
            :disabled="listActionBusy"
            @click="openUpload"
            >上传月度报告</el-button
          >
        </header>

        <section class="msr-card msr-filter-card">
          <el-form :inline="true" :model="filters" size="small" @submit.native.prevent="queryList">
            <el-form-item label="报告月份">
              <el-date-picker
                v-model="filters.reportMonth"
                type="month"
                format="yyyy-MM"
                value-format="yyyyMM"
                placeholder="请选择月份"
                :editable="false"
                clearable
              />
            </el-form-item>
            <el-form-item label="报告状态">
              <el-select v-model="filters.status" placeholder="全部状态" clearable>
                <el-option
                  v-for="status in statusOptions"
                  :key="status.value"
                  :label="status.label"
                  :value="status.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item class="msr-filter-actions">
              <el-button
                type="primary"
                :loading="listLoading"
                :disabled="listActionBusy"
                native-type="submit"
                icon="el-icon-search"
                >查询</el-button
              >
              <el-button :disabled="listLoading || listActionBusy" @click="resetFilters"
                >重置</el-button
              >
            </el-form-item>
          </el-form>
        </section>
        <section class="msr-card msr-list-card">
          <div class="msr-list-heading">
            <span>报告列表</span><span class="msr-muted">共 {{ total }} 份报告</span>
          </div>
          <el-alert
            v-if="listError"
            :title="listError"
            type="error"
            :closable="false"
            show-icon
            class="msr-inline-alert"
          />
          <el-table
            v-loading="listLoading"
            :data="records"
            row-key="reportId"
            empty-text="暂无符合条件的报告"
            element-loading-text="正在查询报告…"
            class="msr-table"
          >
            <el-table-column label="报告月份" min-width="105">
              <template slot-scope="scope">{{ displayMonth(scope.row.reportMonth) }}</template>
            </el-table-column>
            <el-table-column label="报告标题" min-width="250" show-overflow-tooltip>
              <template slot-scope="scope"
                ><span class="msr-report-name">{{ scope.row.reportName }}</span>
                <div v-if="scope.row.hasUnpublishedChanges" class="msr-row-note">
                  有未发布修改
                </div></template
              >
            </el-table-column>
            <el-table-column label="状态" min-width="135">
              <template slot-scope="scope">
                <el-tooltip
                  :disabled="!scope.row.parseError"
                  :content="scope.row.parseError"
                  placement="top"
                >
                  <el-tag size="small" :type="statusMeta(scope.row.status).type">{{
                    statusMeta(scope.row.status).label
                  }}</el-tag>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column label="最近更新" min-width="185">
              <template slot-scope="scope"
                ><div class="msr-update-time">{{ scope.row.updateTime }}</div>
                <div class="msr-update-person">{{ scope.row.updateBy }}</div></template
              >
            </el-table-column>
            <el-table-column label="操作" min-width="310">
              <template slot-scope="scope">
                <div class="msr-row-actions">
                  <span v-if="scope.row.status === states.PARSING" class="msr-parsing-label"
                    ><i class="el-icon-loading"></i> 正在解析，请稍候</span
                  >
                  <template v-else-if="scope.row.status === states.FAILED">
                    <el-button
                      type="text"
                      size="small"
                      :disabled="listActionBusy"
                      @click="reparseReport(scope.row)"
                      >重试</el-button
                    >
                    <el-button
                      type="text"
                      size="small"
                      class="msr-danger"
                      :disabled="listActionBusy"
                      @click="deleteReport(scope.row)"
                      >删除</el-button
                    >
                  </template>
                  <template v-else>
                    <el-button
                      type="text"
                      size="small"
                      :disabled="listActionBusy"
                      @click="openConfirm(scope.row)"
                      >编辑</el-button
                    >
                    <el-button
                      v-if="scope.row.status === states.PUBLISHED"
                      type="text"
                      size="small"
                      :disabled="listActionBusy"
                      @click="offlineReport(scope.row)"
                      >下架</el-button
                    >
                    <el-button
                      v-else
                      type="text"
                      size="small"
                      :disabled="listActionBusy"
                      @click="publishFromList(scope.row)"
                      >上架</el-button
                    >
                    <el-button
                      type="text"
                      size="small"
                      :disabled="listActionBusy"
                      @click="openCustomerPreview(scope.row)"
                      >预览</el-button
                    >
                    <template v-if="scope.row.status !== states.PUBLISHED">
                      <el-button
                        type="text"
                        size="small"
                        :disabled="listActionBusy"
                        @click="reparseReport(scope.row)"
                        >重新解析</el-button
                      >
                      <el-button
                        type="text"
                        size="small"
                        class="msr-danger"
                        :disabled="listActionBusy"
                        @click="deleteReport(scope.row)"
                        >删除</el-button
                      >
                    </template>
                  </template>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <div class="msr-pagination">
            <el-pagination
              background
              :current-page="pageNo"
              :page-size="pageSize"
              :page-sizes="[5, 10, 20, 50]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              :disabled="listLoading || listActionBusy"
              @size-change="changePageSize"
              @current-change="changePage"
            />
          </div>
        </section>
        <footer class="msr-list-notes">
          <strong>操作说明</strong>
          <p>编辑 = 进入确认观点页；上架 / 下架 = 发布与下线对客内容。</p>
          <p>删除 = 待确认、草稿可删除，已发布需先下架。</p>
          <p>当月已有报告时，上传页中该月份不可选。</p>
        </footer>
      </template>

      <template v-else-if="currentView === 'upload'">
        <nav class="msr-back-nav">
          <el-button
            type="text"
            icon="el-icon-arrow-left"
            :disabled="uploadSubmitting || listActionBusy"
            @click="returnToList"
            >返回列表</el-button
          >
        </nav>
        <header class="msr-page-header">
          <div>
            <h1>上传月度报告</h1>
          </div>
        </header>
        <section class="msr-card msr-upload-card">
          <!-- <el-steps :active="parsingReport ? 1 : 0" align-center class="msr-upload-steps"
            ><el-step title="上传报告" /><el-step title="模拟解析" /><el-step title="确认与发布"
          /></el-steps> -->
          <el-form
            ref="uploadForm"
            :model="uploadForm"
            :rules="uploadRules"
            label-position="top"
            class="msr-upload-form"
            @submit.native.prevent="startUpload"
          >
            <el-form-item label="报告月份" prop="reportMonth">
              <el-date-picker
                ref="uploadMonthPicker"
                v-model="uploadForm.reportMonth"
                type="month"
                format="yyyy-MM"
                value-format="yyyyMM"
                placeholder="请选择报告月份"
                :editable="false"
                :disabled="uploadSubmitting || !!parsingReport"
                :picker-options="monthPickerOptions"
                @focus="attachMonthPanel"
                @change="checkSelectedMonth"
              />
              <span v-if="monthLoading" class="msr-month-loading"
                ><i class="el-icon-loading"></i> 正在查询可选月份</span
              >
              <p class="msr-field-tip">当月已有报告的月份不可选，不允许重复上传</p>
              <div v-if="monthError" class="msr-month-error">
                {{ monthError }}
                <el-button type="text" size="small" @click="loadMonthYear(monthPanelYear, true)"
                  >重新查询</el-button
                >
              </div>
            </el-form-item>
            <el-form-item label="报告文件" prop="file">
              <el-upload
                v-if="!displayUploadFile"
                ref="reportUpload"
                :action="apiPaths.UPLOAD"
                drag
                :auto-upload="false"
                :file-list="uploadFileList"
                :show-file-list="false"
                :limit="1"
                accept=".pptx,.pdf"
                :disabled="uploadSubmitting || !!parsingReport"
                :on-change="handleFileChange"
                :on-exceed="handleFileExceed"
                :before-upload="validateUploadFile"
                class="msr-uploader"
              >
                <i class="el-icon-upload"></i>
                <div class="el-upload__text">将文件拖到此处，或<em>点击选择文件</em></div>
                <div class="msr-upload-hint">支持 PPTX、PDF，最多 1 个文件，不超过 50MB</div>
              </el-upload>
              <div v-else class="msr-file-card">
                <span
                  :class="['msr-file-icon', { 'is-pdf': displayUploadFile.extension === 'pdf' }]"
                  >{{ displayUploadFile.extension === 'pdf' ? 'PDF' : 'PPT' }}</span
                >
                <div class="msr-file-info">
                  <strong :title="displayUploadFile.name">{{ displayUploadFile.name }}</strong
                  ><span
                    >{{ formatFileSize(displayUploadFile.size) }} ·
                    {{ uploadPageCountText }}
                    · {{ filePageCountError ? '页数读取失败' : '校验通过' }}</span
                  >
                </div>
                <el-button
                  v-if="!parsingReport"
                  type="text"
                  class="msr-danger"
                  :disabled="uploadSubmitting"
                  @click="clearUploadFile"
                  >删除</el-button
                >
              </div>
              <div v-if="filePageCountError" class="msr-month-error" aria-live="polite">
                {{ filePageCountError }}
                <el-button
                  type="text"
                  size="small"
                  :disabled="uploadSubmitting"
                  @click="readSelectedFilePages(uploadForm.file)"
                  >重新读取页数</el-button
                >
              </div>
              <!-- <p class="msr-field-tip">
                本 Demo 不读取真实 PPTX / PDF 内容；文件格式和大小校验在浏览器端完成。
              </p> -->
            </el-form-item>
            <el-form-item class="msr-start-action"
              ><el-button
                type="primary"
                icon="el-icon-magic-stick"
                native-type="submit"
                :loading="uploadSubmitting"
                :disabled="
                  !!parsingReport || monthLoading || filePageCountLoading || !!filePageCountError
                "
                >开始解析</el-button
              ></el-form-item
            >
          </el-form>
          <div
            v-if="parsingReport"
            class="msr-parse-feedback"
            :class="{ 'is-failed': parsingReport.status === states.FAILED }"
            aria-live="polite"
          >
            <template v-if="parsingReport.status === states.PARSING"
              ><i class="el-icon-loading msr-parse-icon"></i>
              <h3>报告已上传，正在解析</h3>
              <p>正在生成A股、港股、美股、A债、黄金的观点。完成后自动进入「确认观点」。</p>
              <span class="msr-muted"
                >可以返回列表，解析任务会继续；刷新页面后会恢复任务状态。</span
              ></template
            >
            <template v-else-if="parsingReport.status === states.FAILED"
              ><i class="el-icon-warning-outline msr-parse-icon"></i>
              <h3>解析失败</h3>
              <p>{{ parsingReport.parseError }}</p>
              <el-button
                type="primary"
                :loading="listActionBusy"
                @click="reparseReport(parsingReport)"
                >重试解析</el-button
              ><el-button :disabled="listActionBusy" @click="deleteReport(parsingReport, true)"
                >删除并重新上传</el-button
              ></template
            >
            <div v-if="pollError" class="msr-poll-error">
              {{ pollError }}
              <el-button type="text" @click="startParsingPolling(parsingReport.reportId)"
                >继续查询</el-button
              >
            </div>
          </div>
          <p class="msr-upload-bottom">
            提交后系统自动进行报告提炼（5类资产模块观点），完成后自动进入「确认观点」页，无需人工等待。
          </p>
          <!-- <p class="msr-field-tip">
            异常测试：文件名包含“解析失败”或“fail”，首次解析将失败，重试后成功。
          </p>  -->
        </section>
      </template>

      <template v-else-if="currentView === 'confirm' && editingReport">
        <nav class="msr-back-nav">
          <el-button
            type="text"
            icon="el-icon-arrow-left"
            :disabled="editorBusy"
            @click="returnToList"
            >返回列表</el-button
          ><span class="msr-muted">确认观点 · 左侧内容随编辑实时更新</span>
        </nav>
        <header class="msr-confirm-header">
          <div class="msr-confirm-title">
            <h1>{{ editingReport.reportName }}</h1>
            <el-tag :type="statusMeta(editingReport.status).type">{{
              statusMeta(editingReport.status).shortLabel
            }}</el-tag>
          </div>
          <div class="msr-header-actions">
            <el-button :loading="saveBusy" :disabled="editorBusy && !saveBusy" @click="saveDraft"
              >保存草稿</el-button
            ><el-button
              type="primary"
              :loading="publishPreparing || publishBusy"
              :disabled="editorBusy"
              @click="preparePublish"
              >提交发布</el-button
            >
          </div>
        </header>
        <el-alert
          v-if="conflictMessage"
          type="error"
          :closable="false"
          show-icon
          class="msr-inline-alert"
          ><template slot="title"
            >{{ conflictMessage }}
            <el-button type="text" :disabled="editorBusy" @click="refreshEditingReport"
              >刷新当前报告</el-button
            ></template
          ></el-alert
        >
        <!-- <div class="msr-confirm-note"> -->
        <!-- <el-tag v-if="isDirty" type="warning" size="mini">未保存修改</el-tag
          ><el-tag v-else-if="editingReport.hasUnpublishedChanges" type="info" size="mini"
            >未发布修改</el-tag
          > -->
        <!-- </div> -->
        <div class="msr-confirm-grid">
          <section class="msr-preview-column">
            <MonthlyStrategyReportPreview
              :asset-list="editingReport.assetList"
              :active-asset-type="activeAssetType"
              @asset-change="activeAssetType = $event"
            />
          </section>
          <aside class="msr-card msr-editor">
            <div class="msr-editor-heading">
              <strong>观点配置</strong><span>版本 {{ editingReport.version }}</span>
            </div>
            <div class="msr-editor-tabs" role="tablist" aria-label="资产观点编辑">
              <el-button
                v-for="asset in assetTypes"
                :key="asset.type"
                size="small"
                role="tab"
                :aria-selected="activeAssetType === asset.type ? 'true' : 'false'"
                :class="{ 'is-active': activeAssetType === asset.type }"
                @click="activeAssetType = asset.type"
                >{{ asset.name }}</el-button
              >
            </div>
            <template v-if="activeEditingAsset">
              <section v-for="section in moduleTypes" :key="section.key" class="msr-editor-section">
                <div class="msr-editor-section-header">
                  <span class="msr-module-badge"
                    ><i :class="section.icon"></i> {{ section.name }}</span
                  ><el-button
                    type="text"
                    size="small"
                    :disabled="editorBusy"
                    @click="viewOriginal(section)"
                    >查看原文</el-button
                  >
                </div>
                <label class="msr-input-label" :for="'msr-title-' + section.key">板块标题</label>
                <el-input
                  :id="'msr-title-' + section.key"
                  v-model="activeEditingAsset[section.key].moduleTitle"
                  :disabled="editorBusy"
                  size="small"
                  maxlength="120"
                  placeholder="请输入板块标题"
                  :data-module="section.key"
                />
                <div
                  v-for="(point, index) in activeEditingAsset[section.key].pointList"
                  :key="point._key"
                  class="msr-point-editor"
                >
                  <div class="msr-point-heading">
                    <label :for="point._key">要点{{ index + 1 }}</label
                    ><el-button
                      type="text"
                      size="small"
                      class="msr-danger"
                      :disabled="editorBusy"
                      @click="deletePoint(section.key, index)"
                      >删除</el-button
                    >
                  </div>
                  <el-input
                    :id="point._key"
                    v-model="point.content"
                    type="textarea"
                    :autosize="{ minRows: 3, maxRows: 9 }"
                    :disabled="editorBusy"
                    maxlength="2000"
                    placeholder="请输入要点正文"
                  />
                </div>
                <el-button
                  class="msr-add-point"
                  size="small"
                  icon="el-icon-plus"
                  :disabled="editorBusy"
                  @click="addPoint(section.key)"
                  >添加要点</el-button
                >
              </section>
            </template>
          </aside>
        </div>
      </template>

      <template v-else-if="currentView === 'preview' && previewReport">
        <nav class="msr-back-nav">
          <el-button type="text" icon="el-icon-arrow-left" @click="returnToList"
            >返回列表</el-button
          >
        </nav>
        <header class="msr-customer-header"><h1>资配首页 · 月度策略解读卡片（预览）</h1></header>
        <div class="msr-preview-description">
          <strong>{{ previewReport.reportName }}</strong
          ><el-tag :type="previewSource === 'published' ? 'success' : 'warning'" size="small">{{
            previewSource === 'published'
              ? '已发布快照'
              : previewSource === 'offline'
              ? '已下架快照预览'
              : '草稿预览'
          }}</el-tag>
        </div>

        <MonthlyStrategyReportPreview
          :asset-list="previewAssets"
          :active-asset-type="activeAssetType"
          :footnote="previewFootnote"
          @asset-change="activeAssetType = $event"
        />
      </template>
    </div>

    <el-dialog
      :title="publishDialogTitle"
      :visible.sync="publishDialogVisible"
      width="530px"
      custom-class="msr-publish-dialog"
      :close-on-click-modal="false"
      :close-on-press-escape="!publishBusy"
      :show-close="!publishBusy"
      :before-close="closePublishDialog"
    >
      <div class="msr-publish-content">
        <div>
          <p>发布后将同步至资配首页「月度策略解读」与智能问答，对客生效。</p>
        </div>
      </div>
      <span slot="footer"
        ><el-button :disabled="publishBusy" @click="cancelPublish">取消</el-button
        ><el-button type="primary" :loading="publishBusy" @click="confirmPublish"
          >确认发布</el-button
        ></span
      >
    </el-dialog>

    <el-dialog
      title="报告原文预览"
      :visible.sync="fileDialogVisible"
      width="85%"
      custom-class="msr-file-dialog"
      :close-on-click-modal="false"
      @closed="clearOriginalPreview"
    >
      <div
        v-loading="fileLoading"
        element-loading-text="正在获取原始文件…"
        class="msr-original-content"
      >
        <div class="msr-original-heading">
          <strong>{{ originalFileName }}</strong
          ><span class="msr-muted"
            >当前板块预览第 {{ originalPage }} 页<template
              v-if="editingReport && editingReport.fileMeta.pageCount"
            >
              · 文件共 {{ editingReport.fileMeta.pageCount }} 页</template
            ></span
          >
        </div>
        <el-alert
          v-if="originalMissing"
          :title="originalError"
          type="warning"
          :closable="false"
          show-icon
          class="msr-inline-alert"
        />
        <div v-if="originalMissing && !originalUrl" class="msr-reselect">
          <el-upload
            ref="originalUpload"
            :action="apiPaths.UPLOAD"
            :auto-upload="false"
            :show-file-list="false"
            accept=".pptx,.pdf"
            :on-change="selectOriginalFile"
            ><el-button type="primary" size="small">重新选择对应原文件</el-button></el-upload
          >
          <p class="msr-field-tip">
            请选择与原记录同名、同类型的文件；仅用于本次本地预览，不会替换报告内容。
          </p>
        </div>
        <template v-if="originalUrl">
          <div class="msr-original-download">
            <el-link
              type="primary"
              :href="originalUrl"
              :download="originalFileName"
              :underline="false"
              >下载{{ originalExtension === 'pdf' ? 'PDF' : 'PPTX' }}原文件</el-link
            >
          </div>
          <iframe
            v-if="originalExtension === 'pdf'"
            class="msr-pdf-frame"
            :src="originalUrl + '#page=' + originalPage"
            title="PDF原文件浏览器预览"
          ></iframe>
          <el-result
            v-else
            icon="info"
            title="当前 Mock 不支持PPTX在线渲染"
            sub-title="请下载PPTX原文件，使用支持该格式的应用查看；此处不转换或伪装为PDF。"
          />
        </template>
        <el-alert
          v-else-if="originalError && !originalMissing"
          :title="originalError"
          type="error"
          :closable="false"
          show-icon
        />
      </div>
      <span slot="footer"><el-button @click="fileDialogVisible = false">关闭</el-button></span>
    </el-dialog>
  </main>
</template>

<script>
import MonthlyStrategyReportPreview from './MonthlyStrategyReportPreview.vue'
import { getReportFilePageCount } from '../utils/monthlyReportFilePages'
import {
  REPORT_STATUS,
  STATUS_META,
  ASSET_TYPES,
  MODULE_TYPES,
  validateAssetList,
  getReportFileValidationError,
} from '../utils/monthlyStrategyReport'
import { getAvailableMonths, getReportList, getReportDetail, uploadReport, reparseReport, saveReport, publishReport, offlineReport, deleteReport, getReportFile, resetReportDemo } from '../api/monthlyStrategyReport'

export default {
  name: 'MonthlyStrategyReport',
  components: { MonthlyStrategyReportPreview },
  data() {
    return {
      currentView: 'list',
      states: REPORT_STATUS,
      apiPaths: { UPLOAD: '/api/mr/reports/upload' },
      assetTypes: ASSET_TYPES,
      moduleTypes: MODULE_TYPES,
      statusOptions: Object.values(REPORT_STATUS).map(value => ({
        value,
        label: STATUS_META[value].label,
      })),
      filters: { reportMonth: '', status: '' },
      appliedFilters: { reportMonth: '', status: '' },
      records: [],
      total: 0,
      pageNo: 1,
      pageSize: 10,
      listLoading: false,
      listActionBusy: false,
      listError: '',
      pageLoading: false,
      uploadForm: { reportMonth: '', file: null },
      uploadRules: {
        reportMonth: [{ required: true, message: '请选择报告月份', trigger: 'change' }],
        file: [{ required: true, message: '请选择一个PPTX或PDF报告文件', trigger: 'change' }],
      },
      uploadFileList: [],
      filePageCount: null,
      filePageCountLoading: false,
      filePageCountError: '',
      uploadSubmitting: false,
      monthAvailability: {},
      monthLoadedYears: {},
      monthPanelYear: new Date().getFullYear(),
      monthLoading: false,
      monthError: '',
      parsingReport: null,
      pollError: '',
      editingReport: null,
      savedAssetJson: '',
      pointKeyCounter: 0,
      activeAssetType: ASSET_TYPES[0].type,
      saveBusy: false,
      publishPreparing: false,
      publishBusy: false,
      publishDialogVisible: false,
      publishTarget: null,
      conflictMessage: '',
      previewReport: null,
      previewAssets: [],
      previewSource: 'draft',
      fileDialogVisible: false,
      fileLoading: false,
      originalFileName: '',
      originalExtension: '',
      originalPage: 1,
      originalUrl: '',
      originalMissing: false,
      originalError: '',
    }
  },
  computed: {
    monthPickerOptions() {
      // 未查询或查询中的年份一律不可选，不用当前列表推断占用情况。
      return {
        disabledDate: date => {
          const year = date.getFullYear()
          if (year < 1900 || year > 9999) return true
          // 年份面板只负责导航；不能因尚未请求该年份而把年份入口也禁用。
          // 选定年份后year监听立即发起请求，月份仍须等接口确认后才能选择。
          const control = this.$refs.uploadMonthPicker
          if (control && control.picker && control.picker.currentView === 'year') return false
          const month = `${year}${String(date.getMonth() + 1).padStart(2, '0')}`
          return !this.monthLoadedYears[year] || this.monthAvailability[month] !== false
        },
      }
    },
    displayUploadFile() {
      if (this.parsingReport && this.parsingReport.fileMeta) return this.parsingReport.fileMeta
      const file = this.uploadForm.file
      return file
        ? {
            name: file.name,
            size: file.size,
            extension: file.name.split('.').pop().toLowerCase(),
            pageCount: this.filePageCount,
            pageCountSource: this.filePageCount ? 'FILE' : 'UNKNOWN',
          }
        : null
    },
    uploadPageCountText() {
      if (this.filePageCountLoading) return '正在读取页数…'
      const meta = this.displayUploadFile
      if (!meta || !meta.pageCount) return '页数待解析'
      return `${meta.pageCount}页${meta.extension === 'pptx' ? '（幻灯片）' : ''}`
    },
    activeEditingAsset() {
      return (
        this.editingReport &&
        this.editingReport.assetList.find(asset => asset.assetType === this.activeAssetType)
      )
    },
    isDirty() {
      return Boolean(
        this.editingReport &&
          this.savedAssetJson !== JSON.stringify(this.cleanAssets(this.editingReport.assetList)),
      )
    },
    editorBusy() {
      return (
        this.saveBusy ||
        this.publishPreparing ||
        this.publishBusy ||
        this.publishDialogVisible ||
        this.pageLoading
      )
    },
    publishDialogTitle() {
      const month = this.publishTarget && this.publishTarget.reportMonth
      return month
        ? `确认发布${month.slice(0, 4)}年${Number(month.slice(4))}月月度策略报告？`
        : '确认发布月度策略报告？'
    },

    previewFootnote() {
      return this.previewSource === 'published'
        ? '* 左侧为 HTML 化阅读版报告预览，与对客「市场投研策略」模块展示版式一致，内容随右侧配置实时同步。'
        : '发布后同步至资配首页「阅读策略解读」。'
    },
  },
  created() {
    this._disposed = false
    this._listRequestId = 0
    this._monthRequests = {}
    this._pollRun = 0
    this._pollFailures = 0
    this._fileRequestId = 0
    this._pageCountRun = 0
    this._beforeUnload = event => {
      if (!this.isDirty) return
      event.preventDefault()
      event.returnValue = '观点尚未保存'
    }
    this._storageChanged = () => {
      this.monthLoadedYears = {}
      if (this.currentView === 'list' && !this.listActionBusy) this.fetchList(false)
    }
    window.addEventListener('beforeunload', this._beforeUnload)
    window.addEventListener('storage', this._storageChanged)
    this.fetchList()
  },
  beforeDestroy() {
    this._disposed = true
    this.clearUploadFile()
    this.stopParsingPolling()
    this.stopListPolling()
    this.detachMonthPanel()
    this.clearOriginalPreview()
    window.removeEventListener('beforeunload', this._beforeUnload)
    window.removeEventListener('storage', this._storageChanged)
  },
  methods: {
    readResponse(response) {
      const result = response.data
      if (result instanceof Blob) return result
      if (!result || result.code !== '00000') {
        throw Object.assign(new Error((result && result.message) || '请求失败，请稍后重试'), { code: result && result.code })
      }
      return result.data
    },
    statusMeta(status) {
      return STATUS_META[status] || { label: '未知状态', shortLabel: '未知状态', type: 'info' }
    },
    displayMonth(month) {
      return `${month.slice(0, 4)}-${month.slice(4)}`
    },
    formatFileSize(size) {
      return size >= 1024 * 1024
        ? `${(size / 1024 / 1024).toFixed(1).replace(/\.0$/, '')}MB`
        : `${(size / 1024).toFixed(1)}KB`
    },
    handleApiError(error) {
      if (this._disposed) return
      const message = error.message || '请求异常，请稍后重试'
      if (error.code === '40900' && this.currentView === 'confirm') this.conflictMessage = message
      this.$message.error(message)
    },
    cleanAssets(assets) {
      return assets.map(asset => {
        const clean = { assetType: asset.assetType }
        MODULE_TYPES.forEach(section => {
          const module = asset[section.key]
          clean[section.key] = {
            moduleTitle: module.moduleTitle,
            sourcePage: module.sourcePage,
            pointList: module.pointList.map(point => ({ seq: point.seq, content: point.content })),
          }
        })
        return clean
      })
    },
    setEditingReport(detail) {
      detail.assetList.forEach(asset =>
        MODULE_TYPES.forEach(section => {
          asset[section.key].pointList.forEach(point => {
            point._key = `msr-point-${++this.pointKeyCounter}`
          })
        }),
      )
      this.editingReport = detail
      this.savedAssetJson = JSON.stringify(this.cleanAssets(detail.assetList))
      this.conflictMessage = ''
    },
    async fetchList(showLoading = true) {
      const requestId = ++this._listRequestId
      this.stopListPolling()
      if (showLoading) this.listLoading = true
      try {
        const result = await getReportList({
          ...this.appliedFilters,
          pageNo: this.pageNo,
          pageSize: this.pageSize,
        }).then(this.readResponse)
        if (this._disposed || requestId !== this._listRequestId) return
        this.listError = ''
        this.total = result.total
        if (!result.records.length && result.total && this.pageNo > 1) {
          this.pageNo = Math.max(1, Math.ceil(result.total / this.pageSize))
          return this.fetchList(showLoading)
        }
        this.records = result.records
      } catch (error) {
        if (!this._disposed && requestId === this._listRequestId) {
          this.listError = error.message || '报告列表查询失败，请重试'
          if (showLoading) this.handleApiError(error)
        }
      } finally {
        if (requestId === this._listRequestId) {
          this.listLoading = false
          this.scheduleListPolling()
        }
      }
    },
    queryList() {
      this.appliedFilters = { ...this.filters }
      this.pageNo = 1
      this.fetchList()
    },
    resetFilters() {
      this.filters = { reportMonth: '', status: '' }
      this.queryList()
    },
    changePage(page) {
      this.pageNo = page
      this.fetchList()
    },
    changePageSize(size) {
      this.pageSize = size
      this.pageNo = 1
      this.fetchList()
    },
    scheduleListPolling() {
      if (
        this._disposed ||
        this.currentView !== 'list' ||
        !this.records.some(record => record.status === REPORT_STATUS.PARSING)
      )
        return
      this._listPollTimer = setTimeout(() => this.fetchList(false), 1100)
    },
    stopListPolling() {
      clearTimeout(this._listPollTimer)
      this._listPollTimer = null
    },
    async confirmLeave() {
      if (!this.isDirty) return true
      try {
        await this.$confirm('有未保存的观点修改，离开将放弃这些修改。是否继续？', '未保存修改', {
          confirmButtonText: '放弃修改并离开',
          cancelButtonText: '继续编辑',
          type: 'warning',
          closeOnClickModal: false,
        })
        return true
      } catch (action) {
        return false
      }
    },
    async returnToList() {
      if (!(await this.confirmLeave())) return
      this.stopParsingPolling()
      this.detachMonthPanel()
      this.editingReport = null
      this.previewReport = null
      this.clearUploadFile()
      this.uploadForm = { reportMonth: '', file: null }
      this.uploadFileList = []
      this.parsingReport = null
      this.currentView = 'list'
      await this.fetchList()
    },
    openUpload() {
      this.stopListPolling()
      this.detachMonthPanel()
      this.clearUploadFile()
      this.uploadForm = { reportMonth: '', file: null }
      this.uploadFileList = []
      this.parsingReport = null
      this.pollError = ''
      this.monthAvailability = {}
      this.monthLoadedYears = {}
      this.currentView = 'upload'
      this.loadMonthYear(new Date().getFullYear(), true)
    },
    async loadMonthYear(year, force = false) {
      year = Number(year)
      this.monthPanelYear = year
      if (this._monthRequests[year]) return this._monthRequests[year]
      if (this.monthLoadedYears[year] && !force) return true
      this.$set(this.monthLoadedYears, year, false)
      this.monthLoading = true
      this.monthError = ''
      const months = Array.from(
        { length: 12 },
        (_, index) => `${year}${String(index + 1).padStart(2, '0')}`,
      )
      const task = getAvailableMonths({ months }).then(this.readResponse)
        .then(result => {
          if (this._disposed) return false
          result.months.forEach(item =>
            this.$set(this.monthAvailability, item.month, item.disabled),
          )
          this.$set(this.monthLoadedYears, year, true)
          return true
        })
        .catch(error => {
          if (!this._disposed) {
            this.monthError = error.message || '可选月份查询失败'
            this.handleApiError(error)
          }
          return false
        })
        .finally(() => {
          delete this._monthRequests[year]
          this.monthLoading = Object.keys(this._monthRequests).length > 0
        })
      this._monthRequests[year] = task
      return task
    },
    attachMonthPanel() {
      this.$nextTick(() => {
        const control = this.$refs.uploadMonthPicker
        if (!control) return
        // Element UI 2.15没有公开年份切换事件，监听其日期面板的year计算属性。
        if (!control.picker) control.mountPicker()
        const panel = control.picker
        this.detachMonthPanel()
        this._monthPanelUnwatch = panel.$watch('year', year => this.loadMonthYear(year, true), {
          sync: true,
        })
        this.loadMonthYear(panel.year, true)
      })
    },
    detachMonthPanel() {
      if (this._monthPanelUnwatch) this._monthPanelUnwatch()
      this._monthPanelUnwatch = null
    },
    async checkSelectedMonth(month) {
      if (!month) return
      const ready = await this.loadMonthYear(month.slice(0, 4))
      if (!ready || this.monthAvailability[month] !== false) {
        if (this.uploadForm.reportMonth === month) this.uploadForm.reportMonth = ''
        this.$message.warning(
          ready ? '该月份已有报告，请选择其他月份' : '月份信息尚未确认，请稍后重新选择',
        )
      }
    },
    validateUploadFile(file) {
      const error = getReportFileValidationError(file)
      if (error) this.$message.error(error)
      return !error
    },
    handleFileChange(file, files) {
      if (files.length > 1) {
        this.handleFileExceed()
        return
      }
      if (!this.validateUploadFile(file.raw)) {
        this.clearUploadFile()
        return
      }
      this.uploadForm.file = file.raw
      this.uploadFileList = [file]
      this.$nextTick(() => this.$refs.uploadForm && this.$refs.uploadForm.validateField('file'))
      this.readSelectedFilePages(file.raw)
    },
    async readSelectedFilePages(file) {
      if (!file) return
      if (this._pageCountController) this._pageCountController.abort()
      const controller = new AbortController()
      this._pageCountController = controller
      const run = ++this._pageCountRun
      this.filePageCount = null
      this.filePageCountError = ''
      this.filePageCountLoading = true
      try {
        const count = await getReportFilePageCount(file, { signal: controller.signal })
        if (this._disposed || run !== this._pageCountRun || this.uploadForm.file !== file) return
        this.filePageCount = count
      } catch (error) {
        if (this._disposed || run !== this._pageCountRun || error.name === 'AbortError') return
        this.filePageCountError = error.message
        this.$message.error(error.message)
      } finally {
        if (run === this._pageCountRun) {
          this.filePageCountLoading = false
          this._pageCountController = null
        }
      }
    },
    handleFileExceed() {
      this.$message.error('每份报告只能选择一个文件，请删除已选文件后再选择')
    },
    clearUploadFile() {
      this._pageCountRun += 1
      if (this._pageCountController) this._pageCountController.abort()
      this._pageCountController = null
      this.filePageCount = null
      this.filePageCountLoading = false
      this.filePageCountError = ''
      this.uploadForm.file = null
      this.uploadFileList = []
      if (this.$refs.reportUpload) this.$refs.reportUpload.clearFiles()
    },
    async startUpload() {
      if (this.uploadSubmitting || this.parsingReport) return
      const valid = await this.$refs.uploadForm.validate().catch(() => false)
      if (
        !valid ||
        this.uploadSubmitting ||
        this.parsingReport ||
        !this.validateUploadFile(this.uploadForm.file)
      )
        return
      if (this.filePageCountLoading || !this.filePageCount || this.filePageCountError) {
        this.$message.warning(this.filePageCountError || '请等待文件页数读取完成后再开始解析')
        return
      }
      this.uploadSubmitting = true
      try {
        const month = this.uploadForm.reportMonth
        if (!(await this.loadMonthYear(month.slice(0, 4), true))) return
        if (this.monthAvailability[month] !== false) {
          this.uploadForm.reportMonth = ''
          this.$message.error('该月份已有报告，请选择其他月份')
          return
        }
        const form = new FormData()
        form.append('reportMonth', month)
        form.append('file', this.uploadForm.file)
        const result = await uploadReport(form).then(this.readResponse)
        if (this._disposed) return
        this.parsingReport = { ...result, fileMeta: this.displayUploadFile }
        this.$message.success('上传成功，正在解析')
        this.startParsingPolling(result.reportId)
      } catch (error) {
        this.handleApiError(error)
      } finally {
        this.uploadSubmitting = false
      }
    },
    startParsingPolling(id) {
      this.stopParsingPolling()
      const run = this._pollRun
      this._pollFailures = 0
      this.pollError = ''
      const poll = async () => {
        try {
          const detail = await getReportDetail(id).then(this.readResponse)
          if (this._disposed || run !== this._pollRun || this.currentView !== 'upload') return
          this.parsingReport = detail
          this.pollError = ''
          this._pollFailures = 0
          if (detail.status === REPORT_STATUS.PENDING) {
            this.stopParsingPolling()
            this.$message.success('解析完成，请核对并确认五类资产观点')
            await this.openConfirm(detail, true)
            return
          }
          if (detail.status !== REPORT_STATUS.PARSING) return
        } catch (error) {
          if (this._disposed || run !== this._pollRun) return
          this.pollError = error.message || '解析状态查询失败'
          this._pollFailures += 1
          if (this._pollFailures >= 3) {
            this.handleApiError(error)
            return
          }
        }
        if (!this._disposed && run === this._pollRun) this._pollTimer = setTimeout(poll, 750)
      }
      poll()
    },
    stopParsingPolling() {
      clearTimeout(this._pollTimer)
      this._pollTimer = null
      this._pollRun += 1
    },
    async openConfirm(report, alreadyLoaded = false, leaveConfirmed = false) {
      if (!leaveConfirmed && !(await this.confirmLeave())) return
      this.pageLoading = true
      try {
        const detail = alreadyLoaded ? report : await getReportDetail(report.reportId).then(this.readResponse)
        if (this._disposed) return
        if (
          ![REPORT_STATUS.PENDING, REPORT_STATUS.PUBLISHED, REPORT_STATUS.INVALID].includes(
            detail.status,
          )
        )
          throw new Error('该报告尚未完成解析，当前不能编辑')
        const structuralError = validateAssetList(detail.assetList, false)
        if (structuralError) throw new Error(structuralError)
        this.stopListPolling()
        this.stopParsingPolling()
        this.detachMonthPanel()
        this.setEditingReport(detail)
        this.activeAssetType = ASSET_TYPES[0].type
        this.currentView = 'confirm'
      } catch (error) {
        this.handleApiError(error)
      } finally {
        this.pageLoading = false
      }
    },
    addPoint(key) {
      const list = this.activeEditingAsset[key].pointList
      list.push({ seq: list.length + 1, content: '', _key: `msr-point-${++this.pointKeyCounter}` })
    },
    deletePoint(key, index) {
      const list = this.activeEditingAsset[key].pointList
      list.splice(index, 1)
      list.forEach((point, order) => {
        point.seq = order + 1
      })
    },
    async persistDraft(showMessage = true) {
      const detail = await saveReport(this.editingReport.reportId, {
        reportId: this.editingReport.reportId,
        version: this.editingReport.version,
        assetList: this.cleanAssets(this.editingReport.assetList),
      }).then(this.readResponse)
      if (this._disposed) return null
      this.setEditingReport(detail)
      if (showMessage)
        this.$message.success(
          detail.contentConfirmed
            ? '草稿保存成功，完整内容已确认；尚未更新对客快照'
            : '草稿保存成功，内容尚不完整，补充后才能发布',
        )
      return detail
    },
    async saveDraft() {
      if (this.editorBusy) return
      this.saveBusy = true
      try {
        await this.persistDraft()
      } catch (error) {
        this.handleApiError(error)
      } finally {
        this.saveBusy = false
      }
    },
    focusValidation(error) {
      const asset = ASSET_TYPES.find(item => error.startsWith(item.name))
      if (asset) this.activeAssetType = asset.type
      this.$message.error(error)
    },
    async preparePublish() {
      if (this.editorBusy) return
      const error = validateAssetList(this.editingReport.assetList)
      if (error) {
        this.focusValidation(error)
        return
      }
      this.publishPreparing = true
      try {
        if (this.isDirty || !this.editingReport.contentConfirmed) await this.persistDraft(false)
        if (this._disposed) return
        this.publishTarget = {
          reportId: this.editingReport.reportId,
          reportMonth: this.editingReport.reportMonth,
          version: this.editingReport.version,
        }
        this.publishDialogVisible = true
      } catch (error) {
        this.handleApiError(error)
      } finally {
        this.publishPreparing = false
      }
    },
    async publishFromList(report) {
      this.listActionBusy = true
      try {
        const detail = await getReportDetail(report.reportId).then(this.readResponse)
        if (detail.version !== report.version) {
          throw Object.assign(new Error('数据已被其他操作修改，请刷新后重试'), { code: '40900' })
        }
        const error = validateAssetList(detail.assetList)
        if (error || !detail.contentConfirmed) {
          this.$message.warning(error || '请先核对五类资产观点并保存完整草稿，再提交发布')
          await this.openConfirm(detail, true)
          return
        }
        this.publishTarget = {
          reportId: detail.reportId,
          reportMonth: detail.reportMonth,
          version: detail.version,
        }
        this.publishDialogVisible = true
      } catch (error) {
        this.handleApiError(error)
        await this.fetchList(false)
      } finally {
        this.listActionBusy = false
      }
    },
    cancelPublish() {
      if (!this.publishBusy) {
        this.publishDialogVisible = false
        this.publishTarget = null
      }
    },
    closePublishDialog(done) {
      if (!this.publishBusy) {
        this.publishTarget = null
        done()
      }
    },
    async confirmPublish() {
      if (this.publishBusy || !this.publishTarget) return
      this.publishBusy = true
      this.listActionBusy = true
      try {
        const target = this.publishTarget
        await publishReport(target.reportId, { version: target.version }).then(this.readResponse)
        if (this._disposed) return
        this.publishDialogVisible = false
        this.publishTarget = null
        this.editingReport = null
        this.currentView = 'list'
        this.$message.success('模拟发布成功，已更新本浏览器的对客快照')
        await this.fetchList()
      } catch (error) {
        this.publishDialogVisible = false
        this.publishTarget = null
        this.handleApiError(error)
        await this.fetchList(false)
      } finally {
        this.publishBusy = false
        this.listActionBusy = false
      }
    },
    async offlineReport(report) {
      try {
        await this.$confirm(
          '下架后该报告的模拟对客内容将失效，仍保留草稿和最后发布快照。是否下架？',
          '确认下架报告',
          {
            confirmButtonText: '确认下架',
            cancelButtonText: '取消',
            type: 'warning',
            closeOnClickModal: false,
          },
        )
      } catch (action) {
        return
      }
      this.listActionBusy = true
      try {
        await offlineReport(report.reportId, { version: report.version }).then(this.readResponse)
        this.$message.success('下架成功，报告已失效')
        await this.fetchList()
      } catch (error) {
        this.handleApiError(error)
        await this.fetchList(false)
      } finally {
        this.listActionBusy = false
      }
    },
    async deleteReport(report, reupload = false) {
      try {
        await this.$confirm(
          `删除后无法恢复该报告${
            reupload ? '，可重新选择文件上传' : '，该月份将恢复可选'
          }。是否继续？`,
          '确认删除报告',
          {
            confirmButtonText: '确认删除',
            cancelButtonText: '取消',
            type: 'warning',
            closeOnClickModal: false,
          },
        )
      } catch (action) {
        return
      }
      this.listActionBusy = true
      try {
        await deleteReport(report.reportId, { version: report.version }).then(this.readResponse)
        this.$message.success('报告删除成功')
        this.monthLoadedYears = {}
        if (reupload) {
          this.stopParsingPolling()
          this.openUpload()
        } else await this.fetchList()
      } catch (error) {
        this.handleApiError(error)
        if (!reupload) await this.fetchList(false)
      } finally {
        this.listActionBusy = false
      }
    },
    async reparseReport(report) {
      try {
        await this.$confirm(
          '重新解析将生成新的模拟观点并覆盖编辑草稿，需要再次确认后发布；已发布快照会保留。是否继续？',
          '确认重新解析',
          {
            confirmButtonText: '确认解析',
            cancelButtonText: '取消',
            type: 'warning',
            closeOnClickModal: false,
          },
        )
      } catch (action) {
        return
      }
      this.listActionBusy = true
      try {
        const result = await reparseReport({
          reportMonth: report.reportMonth,
          reportId: report.reportId,
          version: report.version,
        }).then(this.readResponse)
        const detail = await getReportDetail(result.reportId).then(this.readResponse)
        if (this._disposed) return
        this.stopListPolling()
        this.detachMonthPanel()
        this.uploadForm = { reportMonth: detail.reportMonth, file: null }
        this.uploadFileList = []
        this.parsingReport = detail
        this.currentView = 'upload'
        this.$message.success('已开始重新解析')
        this.startParsingPolling(detail.reportId)
      } catch (error) {
        this.handleApiError(error)
        if (this.currentView === 'list') await this.fetchList(false)
      } finally {
        this.listActionBusy = false
      }
    },
    async refreshEditingReport() {
      if (!(await this.confirmLeave())) return
      await this.openConfirm({ reportId: this.editingReport.reportId }, false, true)
    },
    async openCustomerPreview(report) {
      if (!(await this.confirmLeave())) return
      this.pageLoading = true
      try {
        const detail = await getReportDetail(report.reportId).then(this.readResponse)
        if (this._disposed) return
        this.stopListPolling()
        this.previewReport = detail
        if (detail.status === REPORT_STATUS.PUBLISHED && detail.publishedSnapshot)
          this.previewSource = 'published'
        else if (detail.status === REPORT_STATUS.INVALID && detail.publishedSnapshot)
          this.previewSource = 'offline'
        else this.previewSource = 'draft'
        this.previewAssets =
          this.previewSource === 'draft' ? detail.assetList : detail.publishedSnapshot.assetList
        this.activeAssetType = ASSET_TYPES[0].type
        this.currentView = 'preview'
      } catch (error) {
        this.handleApiError(error)
      } finally {
        this.pageLoading = false
      }
    },
    async viewOriginal(section) {
      this.clearOriginalPreview()
      const requestId = ++this._fileRequestId
      const report = this.editingReport
      this.originalFileName = report.fileMeta.name
      this.originalExtension = report.fileMeta.extension
      this.originalPage = this.activeEditingAsset[section.key].sourcePage || 1
      this.fileDialogVisible = true
      this.fileLoading = true
      try {
        const file = await getReportFile(report.reportId).then(this.readResponse)
        if (requestId !== this._fileRequestId || !this.fileDialogVisible || this._disposed) return
        this.setOriginalUrl(file)
      } catch (error) {
        if (
          requestId !== this._fileRequestId ||
          this._disposed
        )
          return
        this.originalMissing = error.code === '41000'
        this.originalError = error.message || '获取原文件失败'
      } finally {
        if (requestId === this._fileRequestId) this.fileLoading = false
      }
    },
    setOriginalUrl(file) {
      if (this.originalUrl) URL.revokeObjectURL(this.originalUrl)
      const blob =
        this.originalExtension === 'pdf' ? new Blob([file], { type: 'application/pdf' }) : file
      this.originalUrl = URL.createObjectURL(blob)
    },
    selectOriginalFile(file) {
      if (!this.validateUploadFile(file.raw)) return
      if (
        file.name !== this.originalFileName ||
        file.name.split('.').pop().toLowerCase() !== this.originalExtension
      ) {
        this.$message.error('请选择与原报告同名、同类型的文件，以免预览错误原文')
        return
      }
      this.setOriginalUrl(file.raw)
      if (this.$refs.originalUpload) this.$refs.originalUpload.clearFiles()
      this.$message.success('原文件已选择，当前页码定位')
    },
    clearOriginalPreview() {
      this._fileRequestId += 1
      if (this.originalUrl) URL.revokeObjectURL(this.originalUrl)
      this.originalUrl = ''
      this.originalMissing = false
      this.originalError = ''
      this.fileLoading = false
    },
    async resetMockData() {
      try {
        await this.$confirm(
          '将清空本浏览器的报告数据，恢复15份初始示例报告。是否继续？',
          '恢复初始示例数据',
          {
            confirmButtonText: '确认恢复',
            cancelButtonText: '取消',
            type: 'warning',
            closeOnClickModal: false,
          },
        )
      } catch (action) {
        return
      }
      this.listActionBusy = true
      try {
        await resetReportDemo().then(this.readResponse)
        this.monthLoadedYears = {}
        this.filters = { reportMonth: '', status: '' }
        this.$message.success('已恢复初始示例数据')
        this.resetFilters()
      } catch (error) {
        this.handleApiError(error)
      } finally {
        this.listActionBusy = false
      }
    },
  },
}
</script>

<style scoped>
.msr-page {
  min-height: calc(100vh - 16px);
  background: #f4f6fa;
  color: #27364b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  box-sizing: border-box;
  padding: 28px 32px 36px;
}
.msr-page *,
.msr-page *::before,
.msr-page *::after {
  box-sizing: border-box;
}
.msr-container {
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  min-width: 0;
}
.msr-page h1 {
  font-size: 24px;
  line-height: 1.45;
  font-weight: 600;
  color: #1c2d45;
  margin: 0;
}
.msr-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.msr-page-header p {
  color: #8a95a5;
  font-size: 13px;
  line-height: 1.8;
  margin: 7px 0 0;
}
.msr-page ::v-deep .el-button {
  border-radius: 5px;
}
.msr-page ::v-deep .el-button--primary {
  background: #2868cc;
  border-color: #2868cc;
}
.msr-page ::v-deep .el-button--primary:hover {
  background: #3979dc;
  border-color: #3979dc;
}
.msr-page ::v-deep .el-button--primary.is-disabled {
  background: #98b9eb;
  border-color: #98b9eb;
}
.msr-demo-notice {
  margin-bottom: 20px;
}
.msr-demo-notice.el-alert {
  background: #eaf1fc;
  color: #547199;
  border: 1px solid #dae6f8;
  border-radius: 6px;
}
.msr-demo-notice ::v-deep .el-alert__title {
  font-size: 12px;
  line-height: 1.8;
}
.msr-card {
  border: 1px solid #e7ebf2;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(38, 65, 106, 0.025);
  min-width: 0;
}
.msr-filter-card {
  padding: 22px 24px 0;
  margin-bottom: 20px;
}
.msr-filter-card ::v-deep .el-form-item {
  margin-right: 24px;
  margin-bottom: 22px;
}
.msr-filter-card ::v-deep .el-form-item__label {
  padding-right: 12px;
  color: #58657a;
}
.msr-filter-card ::v-deep .el-date-editor {
  width: 185px;
}
.msr-filter-card ::v-deep .el-select {
  width: 175px;
}
.msr-list-card {
  padding: 0 24px;
  overflow: hidden;
}
.msr-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 0;
  font-size: 15px;
  font-weight: 600;
}
.msr-muted {
  color: #8995a7;
  font-size: 12px;
  line-height: 1.8;
  font-weight: 400;
}
.msr-table {
  width: 100%;
}
.msr-table ::v-deep th.el-table__cell {
  background: #f6f8fc;
  color: #647187;
  font-weight: 500;
  padding: 12px 0;
}
.msr-table ::v-deep td.el-table__cell {
  padding: 17px 0;
}
.msr-table ::v-deep .cell {
  line-height: 1.7;
}
.msr-report-name {
  font-weight: 500;
  color: #34445a;
}
.msr-update-time {
  font-size: 12px;
  color: #4f5c70;
  white-space: nowrap;
}
.msr-update-person {
  font-size: 12px;
  color: #9ca5b3;
  margin-top: 3px;
}
.msr-row-note {
  color: #9c8652;
  font-size: 11px;
}
.msr-row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.msr-row-actions .el-button {
  margin: 0;
  padding: 4px 0;
}
.msr-danger.el-button--text {
  color: #e56b6b;
}
.msr-danger.el-button--text.is-disabled {
  color: #c0c4cc;
}
.msr-parsing-label {
  color: #7892b7;
  font-size: 12px;
}
.msr-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 22px 0;
  overflow-x: auto;
}
.msr-list-notes {
  margin-top: 23px;
  padding: 0 4px;
  color: #929baa;
  font-size: 12px;
  line-height: 1.8;
}
.msr-list-notes strong {
  color: #718095;
  font-weight: 500;
}
.msr-list-notes p {
  margin: 5px 0;
}
.msr-back-nav {
  display: flex;
  align-items: center;
  gap: 22px;
  margin: -5px 0 16px;
}
.msr-back-nav .el-button {
  margin: 0;
  font-size: 13px;
}
.msr-upload-card {
  max-width: 940px;
  padding: 30px 52px 25px;
}
.msr-upload-steps {
  max-width: 700px;
  margin: 0 auto 36px;
}
.msr-upload-steps ::v-deep .el-step__title {
  font-size: 14px;
}
.msr-upload-form {
  max-width: 690px;
  margin: 0 auto;
}
.msr-upload-form ::v-deep .el-form-item__label {
  font-weight: 500;
  padding-bottom: 6px;
}
.msr-upload-form ::v-deep .el-date-editor {
  width: 280px;
  max-width: 100%;
}
.msr-field-tip {
  color: #95a0af;
  font-size: 12px;
  line-height: 1.8;
  margin: 8px 0 0;
}
.msr-month-loading {
  color: #8193ad;
  font-size: 12px;
  margin-left: 12px;
}
.msr-month-error {
  color: #e56b6b;
  font-size: 12px;
  line-height: 1.7;
}
.msr-uploader ::v-deep .el-upload {
  width: 100%;
}
.msr-uploader ::v-deep .el-upload-dragger {
  width: 100%;
  height: 190px;
  background: #fafcff;
  border-color: #cbd7e8;
  border-radius: 7px;
}
.msr-uploader ::v-deep .el-icon-upload {
  font-size: 46px;
  color: #83a7dc;
  margin-top: 26px;
  margin-bottom: 8px;
}
.msr-upload-hint {
  color: #9aa6b6;
  font-size: 12px;
  line-height: 1.8;
  margin-top: 6px;
}
.msr-file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 19px 22px;
  border: 1px solid #dce6f4;
  background: #f7faff;
  border-radius: 7px;
}
.msr-file-icon {
  flex: 0 0 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 58px;
  background: #fff1e9;
  color: #df8044;
  border: 1px solid #f3dbcb;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}
.msr-file-icon.is-pdf {
  background: #fff0f0;
  color: #dc7171;
  border-color: #f5d5d5;
}
.msr-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: 1.7;
}
.msr-file-info strong {
  font-size: 14px;
  font-weight: 500;
  color: #3a4d67;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msr-file-info span {
  font-size: 12px;
  color: #8796aa;
}
.msr-start-action {
  margin-top: 32px;
}
.msr-start-action .el-button {
  min-width: 140px;
}
.msr-parse-feedback {
  max-width: 690px;
  margin: 8px auto 24px;
  padding: 25px;
  background: #f0f6ff;
  border: 1px solid #d6e6fc;
  border-radius: 8px;
  text-align: center;
}
.msr-parse-icon {
  color: #3677d4;
  font-size: 28px;
}
.msr-parse-feedback h3 {
  margin: 13px 0 8px;
  font-size: 16px;
  font-weight: 500;
}
.msr-parse-feedback p {
  font-size: 13px;
  line-height: 1.8;
  margin: 7px 0 15px;
  color: #6b7f9a;
}
.msr-parse-feedback.is-failed {
  background: #fff6f4;
  border-color: #f3d9d2;
}
.msr-parse-feedback.is-failed .msr-parse-icon {
  color: #de8977;
}
.msr-poll-error {
  color: #e56b6b;
  font-size: 12px;
  margin-top: 12px;
}
.msr-upload-bottom {
  max-width: 690px;
  border-top: 1px solid #edf0f5;
  padding-top: 19px;
  margin: 15px auto 0;
  color: #7c8ca2;
  line-height: 1.8;
  font-size: 12px;
}
.msr-upload-card > .msr-field-tip {
  max-width: 690px;
  margin: 8px auto 0;
}
.msr-confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}
.msr-confirm-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.msr-confirm-title h1 {
  font-size: 23px;
}
.msr-confirm-title .el-tag {
  flex-shrink: 0;
}
.msr-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.msr-header-actions .el-button {
  margin: 0;
  white-space: nowrap;
}
.msr-confirm-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #eaf1fc;
  border: 1px solid #dae6f8;
  padding: 12px 15px;
  border-radius: 6px;
  margin-bottom: 22px;
  color: #7486a0;
  font-size: 12px;
  line-height: 1.8;
}
.msr-confirm-note > i {
  color: #6791ca;
  margin-top: 3px;
}
.msr-confirm-note > span {
  flex: 1;
}
.msr-confirm-note .el-tag {
  flex-shrink: 0;
}
.msr-confirm-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr);
  gap: 24px;
  align-items: start;
}
.msr-preview-column {
  min-width: 0;
  position: sticky;
  top: 24px;
}
.msr-editor {
  padding: 22px;
}
.msr-editor-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  margin-bottom: 18px;
}
.msr-editor-heading span {
  color: #9aa5b5;
  font-size: 11px;
}
.msr-editor-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  margin-bottom: 23px;
}
.msr-editor-tabs .el-button {
  margin: 0;
  min-width: 0;
  padding: 10px 0;
  border: 0;
  background: #f1f3f7;
  color: #667388;
}
.msr-editor-tabs .el-button.is-active {
  color: #fff;
  background: #2e6ece;
}
.msr-editor-section + .msr-editor-section {
  border-top: 1px solid #edf0f5;
  margin-top: 27px;
  padding-top: 24px;
}
.msr-editor-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 17px;
}
.msr-editor-section-header .el-button {
  margin: 0;
  font-size: 12px;
  padding: 4px 0;
}
.msr-module-badge {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: #2962b8;
  background: #edf4ff;
  padding: 7px 10px;
  border-radius: 4px;
  font-size: 12px;
}
.msr-input-label {
  display: block;
  margin: 0 0 9px;
  font-size: 12px;
  color: #6a778c;
}
.msr-editor ::v-deep .el-input__inner {
  font-size: 12px;
}
.msr-editor ::v-deep .el-textarea__inner {
  padding: 9px 11px;
  line-height: 1.8;
  color: #59677d;
  font-size: 12px;
}
.msr-point-editor {
  margin-top: 17px;
}
.msr-point-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #6a778c;
  font-size: 12px;
  margin-bottom: 8px;
}
.msr-point-heading .el-button {
  font-size: 11px;
  padding: 3px 0;
}
.msr-add-point.el-button {
  margin: 17px 0 0;
  width: 100%;
  color: #7b98c1;
  border: 1px dashed #cbd7e7;
  background: #fafcff;
  padding: 11px;
}
.msr-add-point.el-button:hover {
  background: #eff5ff;
}
.msr-inline-alert {
  margin-bottom: 18px;
}
.msr-customer-header {
  border-left: 5px solid #2868cc;
  padding-left: 15px;
  margin-bottom: 25px;
}
.msr-customer-header h1 {
  font-size: 22px;
}
.msr-preview-description {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.msr-preview-description strong {
  font-size: 16px;
  font-weight: 500;
}
.msr-publish-content {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  line-height: 1.8;
}
.msr-publish-content p {
  margin: 0 0 12px;
}
.msr-publish-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  height: 42px;
  border-radius: 50%;
  background: #eaf2ff;
  color: #3875cc;
  font-size: 22px;
}
.msr-original-content {
  min-height: 130px;
}
.msr-original-heading {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 20px;
  overflow-wrap: anywhere;
}
.msr-original-download {
  margin: 15px 0;
}
.msr-pdf-frame {
  width: 100%;
  height: 62vh;
  border: 1px solid #e6ebf2;
  border-radius: 4px;
}
.msr-reselect {
  padding: 15px 0;
}
.msr-page ::v-deep .msr-publish-dialog {
  max-width: calc(100vw - 32px);
}
.msr-page ::v-deep .msr-file-dialog {
  max-width: 1280px;
}
@media (max-width: 1200px) {
  .msr-page {
    padding: 24px;
  }
  .msr-confirm-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .msr-preview-column {
    position: static;
  }
  .msr-confirm-title h1 {
    font-size: 20px;
  }
}
@media (max-width: 760px) {
  .msr-page {
    padding: 18px 14px;
  }
  .msr-page h1 {
    font-size: 20px;
  }
  .msr-page-header {
    gap: 12px;
  }
  .msr-page-header > .el-button {
    padding: 11px 12px;
    font-size: 12px;
  }
  .msr-confirm-header {
    flex-wrap: wrap;
    gap: 15px;
  }
  .msr-confirm-title {
    align-items: flex-start;
  }
  .msr-confirm-title h1 {
    font-size: 19px;
  }
  .msr-upload-card {
    padding: 24px 18px;
  }
  .msr-list-card {
    padding: 0 12px;
  }
  .msr-filter-card {
    padding: 18px 16px 0;
  }
  .msr-filter-card ::v-deep .el-form-item {
    margin-right: 0;
  }
  .msr-confirm-note {
    flex-wrap: wrap;
  }
  .msr-confirm-grid {
    gap: 18px;
  }
  .msr-editor {
    padding: 18px;
  }
  .msr-file-card {
    gap: 12px;
    padding: 16px;
  }
  .msr-customer-header h1 {
    font-size: 19px;
  }
  .msr-preview-description {
    flex-wrap: wrap;
  }
  .msr-back-nav {
    gap: 12px;
  }
}
</style>
