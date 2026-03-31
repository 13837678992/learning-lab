<template>
  <div class="create-overlay">
    <div class="create-header">
      <div class="left">
        <el-button type="text" @click="$emit('close')">退出</el-button>
      </div>
    </div>

    <div class="create-content">
      <div class="top-section">
        <div class="left-table">
          <el-table :data="rows" border stripe size="small" class="edit-table" height="100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="month" label="观点月份" min-width="120" />
            <el-table-column prop="assetsType" label="资产类别" min-width="120" />
            <el-table-column prop="assetName" label="研究对象" min-width="160" />
            <el-table-column prop="trackingIndex" label="跟踪指数" min-width="160" />
            <el-table-column prop="opinionEmotion" label="未来6个月观点" min-width="140" />
            <el-table-column prop="opinionDescription" label="论据摘要" min-width="240">
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
            <el-table-column prop="argumentDetail" label="论据详情" min-width="240" />
            <el-table-column prop="opinion" label="机构" min-width="140" />
            <el-table-column prop="sourceChannel" label="来源渠道" min-width="120" />
            <el-table-column prop="dataSource" label="数据来源" min-width="120" />
            <el-table-column label="操作" width="140" fixed="right">
              <template slot-scope="{ row, $index }">
                <el-popconfirm title="是否确认删除？" @confirm="removeRow($index)">
                  <el-button slot="reference" type="text" size="mini">删除</el-button>
                </el-popconfirm>
                <el-popconfirm title="是否确认编辑？" @confirm="startEditRow(row)">
                  <el-button slot="reference" type="text" size="mini">编辑</el-button>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="right-form">
          <div class="form-header-row">
            <div class="form-title">观点上传解析</div>
            <el-button type="primary" plain size="mini" @click="downloadTemplate"
              >提交模板下载</el-button
            >
          </div>
          <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" size="small">
            <el-form-item label="上传文件" prop="fileName">
              <el-upload
                action=""
                :show-file-list="false"
                :auto-upload="false"
                :on-change="handleFileChange"
                :on-remove="handleFileRemove"
              >
                <el-button size="small" type="primary">点击上传</el-button>
                <div slot="tip" class="el-upload__tip" style="margin-top: 5px">
                  请按照机构观点提报模板上传文件，否则可能导致解析失败
                </div>
              </el-upload>
              <div v-if="form.fileName" class="uploaded-file">
                文件：{{ form.fileName }}
                <el-button type="text" size="mini" @click="clearFile">移除</el-button>
              </div>
            </el-form-item>
            <el-form-item label="数据创建时间" prop="createTime">
              <el-date-picker
                v-model="form.createTime"
                type="date"
                placeholder="请选择日期"
                value-format="yyyy-MM-dd"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="来源渠道" prop="sourceChannel">
              <el-select v-model="form.sourceChannel" placeholder="请选择" style="width: 100%">
                <el-option label="邮件" value="邮件" />
                <el-option label="平台" value="平台" />
                <el-option label="外部" value="外部" />
              </el-select>
            </el-form-item>
            <el-form-item label="机构" prop="opinionName">
              <el-input v-model="form.opinionName" placeholder="请输入机构名称" />
            </el-form-item>
            <div class="form-actions">
              <el-button @click="$emit('close')">取消</el-button>
              <el-popover
                placement="top"
                width="320"
                trigger="manual"
                v-model="submitErrorPopoverVisible"
              >
                <div class="error-popover">
                  <div class="title">提交失败</div>
                  <div class="summary">
                    {{ errorSummary.missingCount }}条数据缺失，
                    {{ errorSummary.invalidCount }}条数据未识别
                  </div>
                  <div class="details">
                    <div v-for="(g, i) in groupedErrorTexts" :key="i">{{ g }}</div>
                  </div>
                </div>
                <el-button slot="reference" type="primary" @click="submit">确认</el-button>
              </el-popover>
            </div>
          </el-form>
        </div>
      </div>

      <div class="bottom-section">
        <div class="row-1">
          <div class="left">
            <span class="label">异常检测（{{ detectionCount }}）</span>
            <el-button type="primary" size="mini" @click="runDetection">数据检测</el-button>
          </div>
          <div class="right">
            <el-button @click="$emit('close')">取消</el-button>
            <el-button type="primary" @click="submit">提交观点</el-button>
          </div>
        </div>
        <div class="row-2">
          <div class="error-list" v-if="detectionTriggered && errorList.length > 0">
            <div class="error-title">错误明细</div>
            <div class="error-group" v-for="(g, i) in groupedErrorTexts" :key="i">
              <span class="text">{{ g }}</span>
            </div>
          </div>
          <div class="no-error" v-else-if="detectionTriggered && errorList.length === 0">
            无异常数据
          </div>
        </div>
      </div>
    </div>
    <el-dialog
      title="编辑观点"
      :visible.sync="editDialogVisible"
      width="600px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" label-width="120px" size="small">
        <el-form-item label="观点月份">
          <el-date-picker
            v-model="editForm.month"
            type="month"
            value-format="yyyy-MM"
            placeholder="选择月份"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="资产类别">
          <el-input v-model="editForm.assetsType"></el-input>
        </el-form-item>
        <el-form-item label="研究对象">
          <el-input v-model="editForm.assetName"></el-input>
        </el-form-item>
        <el-form-item label="跟踪指数">
          <el-input v-model="editForm.trackingIndex"></el-input>
        </el-form-item>
        <el-form-item label="未来6个月观点">
          <el-select v-model="editForm.opinionEmotion" style="width: 100%">
            <el-option label="看多" value="看多"></el-option>
            <el-option label="中性" value="中性"></el-option>
            <el-option label="谨慎" value="谨慎"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="论据摘要">
          <el-input type="textarea" v-model="editForm.opinionDescription" :rows="3"></el-input>
        </el-form-item>
        <el-form-item label="论据详情">
          <el-input type="textarea" v-model="editForm.argumentDetail" :rows="3"></el-input>
        </el-form-item>
        <el-form-item label="机构">
          <el-input v-model="editForm.opinion"></el-input>
        </el-form-item>
        <el-form-item label="来源渠道">
          <el-input v-model="editForm.sourceChannel"></el-input>
        </el-form-item>
        <el-form-item label="数据来源">
          <el-input v-model="editForm.dataSource"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="editDialogVisible = false" size="small">取 消</el-button>
        <el-button type="primary" @click="saveEdit" size="small">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'InstitutionViewpointCreate',
  props: {
    existingData: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      editDialogVisible: false,
      editForm: {},
      editingIndex: -1,
      rows: [
        {
          month: '2025-12',
          assetsType: '股票',
          assetName: '沪深300',
          trackingIndex: '沪深300指数',
          opinionEmotion: '看多',
          opinionDescription: '盈利预期改善，政策环境友好，风险偏好提升。',
          argumentDetail: '宏观回升、估值较低、资金面宽松，存在上修弹性。',
          opinion: '机构A',
          sourceChannel: '平台',
          dataSource: '内部研究',
          expandOpinionDescription: false,
        },
        {
          month: '2025-12',
          assetsType: '债券',
          assetName: '国债指数',
          trackingIndex: '中证国债指数',
          opinionEmotion: '谨慎',
          opinionDescription: '收益率中枢或下移空间有限，配置为底仓。',
          argumentDetail: '政策中性略宽松，长端受供给与期限溢价约束。',
          opinion: '机构B',
          sourceChannel: '外部',
          dataSource: '外部研报',
          expandOpinionDescription: false,
        },
        {
          month: '2026-01',
          assetsType: '商品',
          assetName: '黄金',
          trackingIndex: 'COMEX黄金',
          opinionEmotion: '中性',
          opinionDescription: '避险情绪消退，美联储降息预期波动。',
          argumentDetail: '短期缺乏上行动力，但长期配置价值仍存。',
          opinion: '机构C',
          sourceChannel: '邮件',
          dataSource: '内部研究',
          expandOpinionDescription: false,
        },
      ],
      editingRowId: null,
      form: {
        fileName: '',
        createTime: '',
        sourceChannel: '',
        opinionName: '',
      },
      rules: {
        fileName: [{ required: true, message: '请上传文件', trigger: 'change' }],
        createTime: [{ required: true, message: '请选择数据创建时间', trigger: 'change' }],
        sourceChannel: [{ required: true, message: '请选择来源渠道', trigger: 'change' }],
        opinionName: [{ required: true, message: '请输入机构名称', trigger: 'blur' }],
      },
      detectionTriggered: false,
      detectionCount: 0,
      errorList: [],
      errorSummary: {
        missingCount: 0,
        invalidCount: 0,
      },
      submitErrorPopoverVisible: false,
      allowedOpinions: ['看多', '中性', '谨慎'],
    }
  },
  computed: {
    groupedErrorTexts() {
      const byType = {}
      this.errorList.forEach(e => {
        if (!byType[e.type]) byType[e.type] = []
        byType[e.type].push(e)
      })
      const texts = []
      Object.keys(byType).forEach(type => {
        const items = byType[type]
        const lines = items.map(it => `第${it.index}行${it.message}`)
        const joined = lines.join('，')
        texts.push(joined)
      })
      return texts
    },
  },
  methods: {
    downloadTemplate() {
      this.$message.info('模板下载功能开发中...')
    },
    shouldShowExpand(content) {
      if (!content) return false
      return content.length > 100
    },
    toggleExpand(row, field) {
      const expandField = `expand${field.charAt(0).toUpperCase() + field.slice(1)}`
      this.$set(row, expandField, !row[expandField])
    },
    handleFileChange(file) {
      const name = file.name || (file.raw && file.raw.name) || ''
      this.form.fileName = name
      if (!/\.(xlsx|xls)$/i.test(name)) {
        this.rows = []
        this.$message.error('解析失败：未按模板格式上传')
        return
      }
      // 模拟解析生成数据
      this.rows = [
        {
          month: '2025-12',
          assetsType: '股票',
          assetName: '沪深300',
          trackingIndex: '沪深300指数',
          opinionEmotion: '看多',
          opinionDescription: '盈利预期改善，政策环境友好，风险偏好提升。',
          argumentDetail: '宏观回升、估值较低、资金面宽松，存在上修弹性。',
          opinion: this.form.opinionName || '机构A',
          sourceChannel: this.form.sourceChannel || '平台',
          dataSource: '内部研究',
          expandOpinionDescription: false,
        },
        {
          month: '2025-12',
          assetsType: '债券',
          assetName: '国债指数',
          trackingIndex: '中证国债指数',
          opinionEmotion: '谨慎',
          opinionDescription: '收益率中枢或下移空间有限，配置为底仓。',
          argumentDetail: '政策中性略宽松，长端受供给与期限溢价约束。',
          opinion: this.form.opinionName || '机构A',
          sourceChannel: this.form.sourceChannel || '平台',
          dataSource: '外部研报',
          expandOpinionDescription: false,
        },
      ]
      this.$message.success('文件解析成功')
    },
    handleFileRemove() {
      this.clearFile()
    },
    clearFile() {
      this.form.fileName = ''
      this.rows = []
    },
    startEditRow(row) {
      this.editingIndex = this.rows.indexOf(row)
      this.editForm = { ...row }
      this.editDialogVisible = true
    },
    saveEdit() {
      if (this.editingIndex > -1) {
        this.$set(this.rows, this.editingIndex, { ...this.editForm })
        this.$message.success('修改成功')
      }
      this.editDialogVisible = false
    },
    removeRow(index) {
      this.rows.splice(index, 1)
    },
    runDetection() {
      this.detectionTriggered = true
      this.calculateErrors()
      this.detectionCount = this.errorList.length
      if (this.errorList.length === 0) {
        this.$message.success('数据检测通过：无异常数据')
      } else {
        this.$message.warning('数据检测发现异常，详见下方错误明细')
      }
    },
    calculateErrors() {
      const errors = []
      const requiredFields = [
        'month',
        'assetsType',
        'assetName',
        'trackingIndex',
        'opinionEmotion',
        'opinionDescription',
        'argumentDetail',
        'opinion',
        'sourceChannel',
        'dataSource',
      ]
      this.rows.forEach((r, idx) => {
        const index = idx + 1
        requiredFields.forEach(f => {
          if (r[f] === undefined || r[f] === null || String(r[f]).trim() === '') {
            errors.push({ type: '数据缺失', index, message: `${f}缺失` })
          }
        })
        if (r.opinionEmotion && !this.allowedOpinions.includes(r.opinionEmotion)) {
          errors.push({ type: '未识别', index, message: `未来6个月观点不在限制值范围` })
        }
      })
      this.errorList = errors
      this.errorSummary.missingCount = errors.filter(e => e.type === '数据缺失').length
      this.errorSummary.invalidCount = errors.filter(e => e.type === '未识别').length
    },
    hasDuplicate() {
      // 判重：同一机构来源（opinion），同一观点月份（month），同一资产名称（assetName）
      const setKey = new Set(
        (this.existingData || []).map(
          d => `${d.opinion}|${(d.gmtModified || '').slice(0, 7)}|${d.opinionTarget}`,
        ),
      )
      return this.rows.some(r => setKey.has(`${r.opinion}|${r.month}|${r.assetName}`))
    },
    submit() {
      this.$refs.formRef.validate(valid => {
        if (!valid) {
          this.$message.error('请完整填写右侧表单')
          return
        }
        this.calculateErrors()
        if (this.errorList.length > 0) {
          this.submitErrorPopoverVisible = true
          this.detectionTriggered = true
          this.detectionCount = this.errorList.length
          return
        }
        const proceed = () => {
          this.$message.success('提交成功')
          this.$emit('close')
        }
        if (this.hasDuplicate()) {
          this.$confirm('观点已存在，提交将进行覆盖，是否确认操作', '提示', {
            type: 'warning',
          })
            .then(() => proceed())
            .catch(() => {})
        } else {
          proceed()
        }
      })
    },
  },
}
</script>

<style scoped lang="scss">
.create-overlay {
  position: fixed;
  inset: 0;
  background: #fff;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}
.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
  .center {
    font-weight: 600;
    color: #303133;
  }
}
.create-content {
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.top-section {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0; /* 关键：允许flex子项收缩到小于内容高度，触发内部滚动 */
  margin-bottom: 16px;
}
.left-table {
  flex: 8;
  min-width: 0; /* 防止表格把容器撑开 */
  min-height: 0; /* 关键：允许内部滚动 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 自己不滚，交给内部 */
}
.edit-table {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.right-form {
  flex: 2;
  border-left: 1px dashed #ebeef5;
  padding-left: 16px;
  height: 100%;
  overflow-y: auto;
}
.form-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}
.form-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}
.uploaded-file {
  margin-top: 8px;
  color: #606266;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.expandable-content {
  width: 100%;
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
  .content-expanded {
    white-space: normal;
    word-wrap: break-word;
    overflow: visible;
  }
  .el-button {
    margin-top: 5px;
    color: #409eff;
  }
}
.bottom-section {
  flex-shrink: 0;
  margin-top: 0; /* spacing handled by top-section margin-bottom */
  .row-1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-top: 1px solid #ebeef5;
    .left {
      display: flex;
      align-items: center;
      gap: 12px;
      .label {
        font-weight: 600;
        color: #303133;
      }
    }
    .right {
      display: flex;
      gap: 8px;
    }
  }
  .row-2 {
    margin-top: 12px;
    max-height: 150px;
    overflow-y: auto;
    .error-title {
      color: #f56c6c;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .error-group .text {
      color: #f56c6c;
      line-height: 22px;
    }
    .no-error {
      color: #67c23a;
    }
  }
}
.error-popover .title {
  font-weight: 600;
  color: #f56c6c;
}
.error-popover .summary {
  margin-top: 6px;
  color: #f56c6c;
}
.error-popover .details {
  margin-top: 6px;
  color: #f56c6c;
}
</style>
