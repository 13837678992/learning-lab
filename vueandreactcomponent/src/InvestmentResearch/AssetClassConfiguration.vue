<template>
  <el-dialog
    title="资产板块列表"
    :visible.sync="dialogVisible"
    width="900px"
    :close-on-click-modal="false"
    append-to-body
    custom-class="asset-config-dialog"
  >
    <div class="asset-config-container">
      <!-- Left Panel: Asset Classes -->
      <div class="left-panel">
        <div class="panel-header">
          <el-button type="primary" size="small" icon="el-icon-plus" @click="addAssetClass">
            新增资产类别
          </el-button>
        </div>
        <div class="asset-list" @dragover.prevent>
          <div
            v-for="(item, index) in localAssetClasses"
            :key="item.tempId || item.id"
            class="asset-item"
            :class="{ active: selectedAssetId === (item.tempId || item.id) }"
            draggable="true"
            @dragstart="onDragStart($event, index)"
            @dragover="onDragOver($event, index)"
            @drop="onDrop($event, index)"
            @click="selectAssetClass(item)"
          >
            <div class="asset-content">
              <template v-if="item.isEditing">
                <el-input
                  v-model="item.editName"
                  size="mini"
                  ref="assetInput"
                  @blur="finishEditAsset(item, index)"
                  @keyup.enter.native="$event.target.blur()"
                />
              </template>
              <template v-else>
                <span class="asset-name">{{ item.name }}</span>
              </template>
            </div>

            <!-- Sort button always visible -->
            <div class="asset-actions-always">
              <i class="el-icon-sort action-icon drag-handle" title="排序"></i>
            </div>

            <!-- Actions shown when selected -->
            <div
              class="asset-actions"
              v-if="selectedAssetId === (item.tempId || item.id) && !item.isEditing"
            >
              <i
                class="el-icon-edit action-icon"
                title="编辑"
                @click.stop="startEditAsset(item)"
              ></i>
              <i
                class="el-icon-delete action-icon"
                title="删除"
                @click.stop="deleteAssetClass(index)"
              ></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Sectors -->
      <div class="right-panel">
        <div class="panel-header right-header">
          <span class="sector-count">包含板块 ({{ currentSectors.length }})</span>
          <el-button
            type="primary"
            size="small"
            icon="el-icon-plus"
            :disabled="!selectedAssetId"
            @click="addSector"
          >
            新增板块
          </el-button>
        </div>
        <div class="sector-grid">
          <div
            v-for="(sector, index) in currentSectors"
            :key="sector.tempId || sector.id"
            class="sector-item"
          >
            <div class="sector-content">
              <template v-if="sector.isEditing">
                <el-input
                  v-model="sector.editName"
                  size="mini"
                  ref="sectorInput"
                  @blur="finishEditSector(sector, index)"
                  @keyup.enter.native="$event.target.blur()"
                />
              </template>
              <template v-else>
                <span class="sector-name">{{ sector.name }}</span>
              </template>
            </div>
            <div class="sector-actions" v-if="!sector.isEditing">
              <i
                class="el-icon-edit action-icon"
                title="编辑"
                @click.stop="startEditSector(sector)"
              ></i>
              <i
                class="el-icon-delete action-icon"
                title="删除"
                @click.stop="deleteSector(index)"
              ></i>
            </div>
          </div>
        </div>
        <div v-if="!selectedAssetId" class="empty-tip">请先选择一个资产类别</div>
      </div>
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button size="small" @click="handleCancel">取 消</el-button>
      <el-button type="primary" size="small" @click="handleConfirm">确 认</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'AssetClassConfiguration',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    initialData: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      localAssetClasses: [],
      selectedAssetId: null,
      draggedIndex: null,
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      },
    },
    currentAsset() {
      return this.localAssetClasses.find(item => (item.tempId || item.id) === this.selectedAssetId)
    },
    currentSectors() {
      return this.currentAsset ? this.currentAsset.sectors : []
    },
  },
  watch: {
    visible(val) {
      if (val) {
        // Transform flat list to hierarchical structure
        // Flat structure: { assetName, assetType, assetStatus, sortOrder }
        // We assume input list contains only relevant items (or we filter by assetStatus=0)

        const groups = {}
        const sortedInput = [...this.initialData].sort((a, b) => a.sortOrder - b.sortOrder)

        sortedInput.forEach(item => {
          if (item.assetStatus === 1) return // Skip invalid items

          const catName = item.assetName
          if (!groups[catName]) {
            groups[catName] = {
              name: catName,
              sectors: [],
              minSortOrder: item.sortOrder,
            }
          }

          if (item.assetType && item.assetType.trim() !== '') {
            groups[catName].sectors.push({
              name: item.assetType,
              sortOrder: item.sortOrder,
            })
          }
        })

        // Convert to array and sort by minSortOrder (preserve category order)
        this.localAssetClasses = Object.values(groups)
          //.sort((a, b) => a.minSortOrder - b.minSortOrder) // Already sorted by input order roughly, but let's be safe
          // Actually, since we iterate sortedInput, the order of creation in groups object implies order.
          // But Object.values order is not guaranteed in all JS engines (though mostly yes).
          // Let's rely on array mapping if possible, or just sort.
          .sort((a, b) => a.minSortOrder - b.minSortOrder)
          .map((g, index) => ({
            id: null, // No persistent ID for category in flat mode, rely on name
            tempId: 'cat_' + index + '_' + Date.now(),
            name: g.name,
            editName: g.name,
            isEditing: false,
            sectors: g.sectors.map((s, sIndex) => ({
              id: null,
              tempId: 'sec_' + index + '_' + sIndex + '_' + Date.now(),
              name: s.name,
              editName: s.name,
              isEditing: false,
            })),
          }))

        // Select first one by default if exists
        if (this.localAssetClasses.length > 0) {
          this.selectedAssetId = this.localAssetClasses[0].tempId
        } else {
          this.selectedAssetId = null
        }
      }
    },
  },
  methods: {
    // Asset Class Methods
    addAssetClass() {
      const newId = 'new_' + Date.now()
      const newAsset = {
        tempId: newId,
        id: null, // New item
        name: '',
        editName: '',
        isEditing: true,
        sectors: [],
      }
      this.localAssetClasses.push(newAsset)
      this.selectedAssetId = newId
      this.$nextTick(() => {
        const inputs = this.$refs.assetInput
        if (inputs && inputs.length > 0) {
          const lastInput = inputs[inputs.length - 1]
          if (lastInput) lastInput.focus()
        }
      })
    },
    selectAssetClass(item) {
      this.selectedAssetId = item.tempId || item.id
    },
    startEditAsset(item) {
      item.editName = item.name
      item.isEditing = true
      this.$nextTick(() => {
        const el = this.$el.querySelector('.asset-item.active .el-input__inner')
        if (el) el.focus()
      })
    },
    finishEditAsset(item) {
      if (!item.editName.trim()) {
        item.name = item.editName
        item.isEditing = false
      } else {
        item.name = item.editName
        item.isEditing = false
      }
    },
    deleteAssetClass(index) {
      const item = this.localAssetClasses[index]
      const isSelected = (item.tempId || item.id) === this.selectedAssetId

      this.$confirm('确定删除该资产类别及其下所有板块吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          this.localAssetClasses.splice(index, 1)
          if (isSelected) {
            if (this.localAssetClasses.length > 0) {
              this.selectedAssetId =
                this.localAssetClasses[0].tempId || this.localAssetClasses[0].id
            } else {
              this.selectedAssetId = null
            }
          }
        })
        .catch(() => {})
    },

    // Drag and Drop for Asset Classes
    onDragStart(event, index) {
      this.draggedIndex = index
      event.dataTransfer.effectAllowed = 'move'
    },
    onDragOver(event) {
      event.preventDefault()
    },
    onDrop(event, index) {
      event.preventDefault()
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        const item = this.localAssetClasses.splice(this.draggedIndex, 1)[0]
        this.localAssetClasses.splice(index, 0, item)
      }
      this.draggedIndex = null
    },

    // Sector Methods
    addSector() {
      if (!this.currentAsset) return
      const newSector = {
        tempId: 'sec_' + Date.now(),
        id: null,
        name: '',
        editName: '',
        isEditing: true,
      }
      this.currentAsset.sectors.push(newSector)
      this.$nextTick(() => {
        const sectorInputs = this.$refs.sectorInput
        if (sectorInputs && sectorInputs.length) {
          sectorInputs[sectorInputs.length - 1].focus()
        }
      })
    },
    startEditSector(sector) {
      sector.editName = sector.name
      sector.isEditing = true
      this.$nextTick(() => {
        const sectorInputs = this.$refs.sectorInput
        if (sectorInputs && sectorInputs.length) {
          sectorInputs[sectorInputs.length - 1].focus()
        }
      })
    },
    finishEditSector(sector) {
      sector.name = sector.editName
      sector.isEditing = false
    },
    deleteSector(index) {
      if (!this.currentAsset) return
      this.$confirm('确定删除该板块吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          this.currentAsset.sectors.splice(index, 1)
        })
        .catch(() => {})
    },

    // Dialog Actions
    handleCancel() {
      this.dialogVisible = false
    },
    handleConfirm() {
      // Convert hierarchical structure back to flat list
      // Flat structure: { assetName, assetType, assetStatus, sortOrder }

      const flatList = []
      let globalSortOrder = 1

      this.localAssetClasses.forEach(asset => {
        const assetName = asset.name ? asset.name.trim() : ''
        if (!assetName) return // Skip empty asset names

        const validSectors = asset.sectors.filter(s => s.name && s.name.trim() !== '')

        if (validSectors.length === 0) {
          // Asset class with no sectors
          flatList.push({
            assetName: assetName,
            assetType: '',
            assetStatus: 0,
            sortOrder: globalSortOrder++,
          })
        } else {
          validSectors.forEach(sector => {
            flatList.push({
              assetName: assetName,
              assetType: sector.name,
              assetStatus: 0,
              sortOrder: globalSortOrder++,
            })
          })
        }
      })

      this.$emit('confirm', flatList)
      this.dialogVisible = false
    },
  },
}
</script>

<style lang="scss" scoped>
.asset-config-container {
  display: flex;
  height: 500px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;

  .left-panel {
    width: 20%;
    border-right: 1px solid #dcdfe6;
    display: flex;
    flex-direction: column;

    .panel-header {
      padding: 10px;
      border-bottom: 1px solid #ebeef5;
      text-align: center;
    }

    .asset-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0;

      .asset-item {
        padding: 8px 10px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f7fa;
        }

        &.active {
          background-color: #e6f1fc;
          color: #409eff;
        }

        .asset-content {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-right: 5px;

          .asset-name {
            font-size: 14px;
          }
        }

        .asset-actions-always {
          display: flex;
          align-items: center;
          margin-left: 5px;

          .action-icon {
            font-size: 14px;
            color: #909399;
            cursor: move;
            padding: 2px;

            &:hover {
              color: #409eff;
            }
          }
        }

        .asset-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 5px;

          .action-icon {
            font-size: 14px;
            color: #909399;
            cursor: pointer;
            padding: 2px;

            &:hover {
              color: #409eff;
            }

            &.drag-handle {
              cursor: move;
            }
          }
        }
      }
    }
  }

  .right-panel {
    width: 80%;
    display: flex;
    flex-direction: column;

    .panel-header {
      padding: 10px 20px;
      border-bottom: 1px solid #ebeef5;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .sector-count {
        font-size: 14px;
        color: #606266;
        font-weight: bold;
      }
    }

    .sector-grid {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 15px;

      .sector-item {
        width: calc((100% - 30px) / 3); // 3 items per row, 15px gap * 2 = 30px
        height: 40px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        display: flex;
        align-items: center;
        padding: 0 10px;
        box-sizing: border-box;
        justify-content: space-between;
        transition: all 0.2s;

        &:hover {
          border-color: #409eff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .sector-content {
          flex: 1;
          margin-right: 5px;
          overflow: hidden;

          .sector-name {
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
          }
        }

        .sector-actions {
          display: flex;
          gap: 5px;

          .action-icon {
            font-size: 14px;
            color: #909399;
            cursor: pointer;

            &:hover {
              color: #409eff;
            }
          }
        }
      }
    }

    .empty-tip {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #909399;
      font-size: 14px;
    }
  }
}
</style>
