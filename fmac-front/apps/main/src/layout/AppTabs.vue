<template>
  <div class="tabs">
    <span
      v-for="item in tabs"
      :key="item.key"
      :class="['tab', { active: item.key === activeKey }]"
      @click="activate(item)"
    >
      {{ item.title }}
      <i v-if="item.closable" class="close" @click.stop="close(item)">×</i>
    </span>
    <span v-if="tabs.length === 0" class="tab-empty">点击左侧菜单打开标签页</span>
  </div>
</template>

<script>
// 标签页状态统一走 @fmac/core 的 tab。
import { tab, router } from '@fmac/core';

export default {
  name: 'AppTabs',
  data() {
    return {
      tabs: [],
      activeKey: null,
      off: null,
    };
  },
  created() {
    this.off = tab.subscribe(({ tabs, activeKey }) => {
      this.tabs = tabs;
      this.activeKey = activeKey;
    });
  },
  beforeDestroy() {
    // §16：卸载时取消订阅。
    if (this.off) this.off();
  },
  methods: {
    activate(item) {
      tab.setActive(item.key);
      router.push(item.path);
    },
    close(item) {
      tab.remove(item.key);
      const active = tab.getActive();
      if (active) router.push(active.path);
    },
  },
};
</script>

<style scoped>
.tabs {
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}
.tab.active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}
.close {
  font-style: normal;
  color: #94a3b8;
}
.close:hover {
  color: #ef4444;
}
.tab-empty {
  font-size: 13px;
  color: #94a3b8;
}
</style>
