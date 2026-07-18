<template>
  <div class="page">
    <h2>财务系统 · 首页</h2>

    <div class="panel">
      <p>
        当前用户（读取共享 <code>store</code>）：<b>{{ userName }}</b>
      </p>
      <p>
        模拟权限：<b>{{ permissions.join(' / ') || '（无）' }}</b>
      </p>
      <p>
        业务配置 · 记账币种（共享 <code>store</code>）：<b>{{ currency }}</b>
        <button class="fbtn" @click="toggleCurrency">切换币种</button>
      </p>
      <p class="tip">最近一次 global:refresh：{{ lastRefresh }}</p>
    </div>

    <div class="quick">
      <button class="fbtn" @click="open('/account', '账户管理')">账户管理</button>
      <button class="fbtn" @click="open('/transaction', '交易流水')">交易流水</button>
      <button class="fbtn" @click="open('/report', '报表中心')">报表中心</button>
    </div>
  </div>
</template>

<script>
import { router, getStore, openTab } from '../platform.js';

export default {
  name: 'FinanceHome',
  data() {
    const store = getStore();
    return {
      userName: (store.get('current:user') || {}).name || '未登录',
      permissions: store.get('finance:permissions') || ['account:read', 'transaction:read'],
      currency: store.get('finance:currency') || 'CNY',
      lastRefresh: '—',
      offs: [],
    };
  },
  created() {
    const store = getStore();
    // 初始化模拟权限 / 配置到共享 store（主应用与其它子应用均可读取，验证同步）。
    if (!store.has('finance:permissions')) store.set('finance:permissions', this.permissions);
    if (!store.has('finance:currency')) store.set('finance:currency', this.currency);
    this.offs.push(store.subscribe('finance:currency', (v) => (this.currency = v || 'CNY')));
    this.offs.push(
      store.subscribe('current:user', (u) => (this.userName = (u || {}).name || '未登录')),
    );
    this.offs.push(
      store.subscribe('finance:lastRefresh', (t) => {
        this.lastRefresh = t ? new Date(t).toLocaleTimeString() : '—';
      }),
    );
  },
  beforeDestroy() {
    // §12：清理 store 订阅。
    this.offs.forEach((off) => off && off());
    this.offs = [];
  },
  methods: {
    open(path, title) {
      router.push(path);
      openTab(path, title);
    },
    toggleCurrency() {
      const next = this.currency === 'CNY' ? 'USD' : 'CNY';
      getStore().set('finance:currency', next); // 修改业务配置 → 主/子应用同步
    },
  },
};
</script>

<style scoped>
.panel {
  max-width: 620px;
  padding: 12px 16px;
  background: #faf5ff;
  border: 1px solid #ddd6fe;
  border-radius: 8px;
  line-height: 1.9;
}
.quick {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}
.tip {
  color: #7c3aed;
  font-size: 13px;
}
code {
  background: #ede9fe;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
