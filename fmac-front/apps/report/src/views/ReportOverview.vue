<template>
  <div class="page">
    <h2>报表中心</h2>
    <p class="hint">
      通过共享 <code>event</code> 实时接收其它子应用（用户 / 订单）的动态，读取共享
      <code>store</code>。
    </p>

    <div class="metrics">
      <div class="metric">
        <div class="num">{{ activities.length }}</div>
        <div class="label">已捕获事件</div>
      </div>
      <div class="metric">
        <div class="num">{{ currentUserName }}</div>
        <div class="label">当前用户（共享 store）</div>
      </div>
    </div>

    <h3>跨应用动态</h3>
    <ul class="feed">
      <li v-for="(item, i) in activities" :key="i">
        <span :class="['tag', item.type]">{{ item.type }}</span>
        {{ item.text }}
      </li>
      <li v-if="activities.length === 0" class="empty">
        暂无动态。请在“用户/订单”子应用中点击条目，这里会实时收到事件。
      </li>
    </ul>

    <button class="btn" @click="openDetail">查看示例报表 →</button>
  </div>
</template>

<script>
import { router, getStore, getEvent } from '../platform.js';

export default {
  name: 'ReportOverview',
  data() {
    return {
      activities: [],
      currentUserName: '—',
      offs: [],
    };
  },
  created() {
    const event = getEvent();
    // 订阅跨应用事件（来自 user / order 子应用）。
    this.offs.push(
      event.on('user:selected', (user) => {
        this.currentUserName = user && user.name ? user.name : '—';
        this.activities.unshift({ type: 'user', text: `选择了用户「${user.name}」` });
      }),
    );
    this.offs.push(
      event.on('order:opened', (order) => {
        this.activities.unshift({
          type: 'order',
          text: `打开了订单 #${order.id}（${order.title}）`,
        });
      }),
    );
    // 读取共享 store 的当前用户（若其它子应用已设置）。
    const user = getStore().get('current:user');
    if (user) this.currentUserName = user.name;
  },
  beforeDestroy() {
    // §16：卸载时取消所有订阅，避免内存泄漏。
    this.offs.forEach((off) => off && off());
    this.offs = [];
  },
  methods: {
    openDetail() {
      router.push('/detail/summary');
    },
  },
};
</script>

<style scoped>
.page {
  padding: 16px;
}
.hint {
  color: #64748b;
  font-size: 13px;
}
.metrics {
  display: flex;
  gap: 12px;
  margin: 12px 0;
}
.metric {
  flex: 0 0 200px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.num {
  font-size: 22px;
  font-weight: 700;
  color: #2563eb;
}
.label {
  font-size: 12px;
  color: #64748b;
}
.feed {
  list-style: none;
  padding: 0;
  margin: 8px 0 16px;
  max-width: 620px;
}
.feed li {
  padding: 8px 0;
  border-bottom: 1px dashed #e2e8f0;
  font-size: 14px;
}
.tag {
  display: inline-block;
  min-width: 44px;
  text-align: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 8px;
  color: #fff;
}
.tag.user {
  background: #16a34a;
}
.tag.order {
  background: #d97706;
}
.empty {
  color: #94a3b8;
}
.btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
