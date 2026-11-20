<template>
  <article class="msr-reading">
    <div class="msr-reading__blue">
      <div class="msr-reading__masthead">
        <span class="msr-reading__brand"
          ><i class="el-icon-s-data" aria-hidden="true"></i> 市场投研策略</span
        >
        <el-button type="text" disabled class="msr-reading__source"
          >查看报告 <i class="el-icon-arrow-right"></i
        ></el-button>
      </div>
      <div class="msr-reading__tabs" role="tablist" aria-label="资产观点预览">
        <el-button
          v-for="asset in assetTypes"
          :key="asset.type"
          type="text"
          role="tab"
          :aria-selected="activeAssetType === asset.type ? 'true' : 'false'"
          :class="['msr-reading__tab', { 'is-active': activeAssetType === asset.type }]"
          @click="$emit('asset-change', asset.type)"
          >{{ asset.name }}</el-button
        >
      </div>
    </div>
    <div v-if="activeAsset" class="msr-reading__body">
      <div class="msr-reading__columns">
        <section v-for="section in moduleTypes" :key="section.key" class="msr-reading__section">
          <span class="msr-reading__badge"
            ><i :class="section.icon" aria-hidden="true"></i> {{ section.name }}</span
          >
          <template v-if="activeAsset[section.key]">
            <h3 class="msr-reading__title">
              <span> {{ activeAsset[section.key].moduleTitle || '待填写板块标题' }}</span>
            </h3>
            <ol class="msr-reading__points">
              <li
                v-for="point in orderedPoints(activeAsset[section.key].pointList)"
                :key="point.seq"
              >
                <span class="msr-reading__number">{{ point.seq }}</span>
                <p>{{ point.content || '待填写要点内容' }}</p>
              </li>
            </ol>
            <p v-if="!activeAsset[section.key].pointList.length" class="msr-reading__empty">
              暂无要点，请在配置面板添加。
            </p>
          </template>
          <p v-else class="msr-reading__empty">该板块内容待补充。</p>
        </section>
      </div>
      <p class="msr-reading__footnote">{{ footnote }}</p>
    </div>
    <div v-else class="msr-reading__empty">当前资产暂无内容，请先完成解析或补充草稿。</div>
  </article>
</template>

<script>
import { ASSET_TYPES, MODULE_TYPES } from '../utils/monthlyStrategyReport'

export default {
  name: 'MonthlyStrategyReportPreview',
  props: {
    assetList: { type: Array, default: () => [] },
    activeAssetType: { type: String, required: true },
    footnote: {
      type: String,
      default:
        '* 左侧为HTML化阅读版报告预览，与对客「市场投研策略」模块展示版式一致，内容随右侧配置实时同步。',
    },
  },
  data() {
    return { assetTypes: ASSET_TYPES, moduleTypes: MODULE_TYPES }
  },
  computed: {
    activeAsset() {
      return this.assetList.find(asset => asset.assetType === this.activeAssetType)
    },
  },
  methods: {
    orderedPoints(pointList) {
      return (pointList || []).slice().sort((left, right) => left.seq - right.seq)
    },
  },
}
</script>

<style scoped>
.msr-reading {
  overflow: hidden;
  min-width: 0;
  border: 1px solid #e3e9f2;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 18px rgba(39, 65, 103, 0.035);
}
.msr-reading__blue {
  background: #2465c7;
  color: #fff;
  padding: 20px 26px 0;
}
.msr-reading__masthead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.msr-reading__brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 20px;
  font-weight: 600;
}
.msr-reading__brand i {
  font-size: 24px;
}
.msr-reading__source.el-button.is-disabled {
  color: #d5e5ff;
  font-size: 13px;
}
.msr-reading__tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-top: 17px;
  gap: 8px;
}
.msr-reading__tab.el-button {
  position: relative;
  margin: 0;
  padding: 15px 4px 19px;
  border-radius: 0;
  border: 0;
  color: #d9e7ff;
  font-size: 15px;
  transition: background 0.15s;
}
.msr-reading__tab.el-button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.msr-reading__tab.el-button.is-active {
  color: #fff;
  font-weight: 600;
}
.msr-reading__tab.is-active::after {
  position: absolute;
  content: '';
  bottom: 0;
  left: 28%;
  right: 28%;
  height: 3px;
  background: #fff;
  border-radius: 2px 2px 0 0;
}
.msr-reading__body {
  padding: 30px 28px 20px;
}
.msr-reading__columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px;
}
.msr-reading__section {
  min-width: 0;
}
.msr-reading__section + .msr-reading__section {
  border-left: 1px solid #e9eef5;
  padding-left: 28px;
}
.msr-reading__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2962b8;
  background: #edf4ff;
  padding: 7px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}
.msr-reading__title {
  font-size: 17px;
  line-height: 1.65;
  color: #18283e;
  font-weight: 600;
  margin: 18px 0 21px;
}
.msr-reading__title span {
  position: relative;
  padding-bottom: 15px;
  display: inline-block;
}
.msr-reading__title span::after {
  position: absolute;
  content: '';
  width: 100%;
  height: 3px;
  bottom: 0;
  left: 0;
  background: #3274d5;
  border-radius: 2px;
}

.msr-reading__points {
  margin: 0;
  padding: 0;
  list-style: none;
}
.msr-reading__points li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
}
.msr-reading__number {
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 4px;
  background: #3475d4;
  color: #fff;
  line-height: 22px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
}
.msr-reading__points p {
  margin: 0;
  min-width: 0;
  color: #49566a;
  font-size: 14px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.msr-reading__footnote {
  border-top: 1px solid #edf0f5;
  margin: 12px 0 0;
  padding-top: 17px;
  font-size: 12px;
  line-height: 1.8;
  color: #8b96a7;
}
.msr-reading__simulation {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.8;
  color: #8b96a7;
}
.msr-reading__empty {
  padding: 20px 0;
  color: #909399;
  font-size: 13px;
  line-height: 1.8;
}
.msr-reading > .msr-reading__empty {
  padding: 40px 24px;
}
@media (max-width: 700px) {
  .msr-reading__blue {
    padding: 16px 18px 0;
  }
  .msr-reading__brand {
    font-size: 18px;
  }
  .msr-reading__body {
    padding: 24px 18px 16px;
  }
  .msr-reading__columns {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
  }
  .msr-reading__section + .msr-reading__section {
    border-left: 0;
    border-top: 1px solid #e9eef5;
    padding: 24px 0 0;
  }
}
</style>
