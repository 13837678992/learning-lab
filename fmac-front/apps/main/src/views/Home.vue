<template>
  <div class="page">
    <h2>首页</h2>
    <p>这是基座（主应用）自身的页面 —— Vue 2.7。</p>
    <div class="card">
      <p>
        计数（存于 <code>@fmac/store</code>，跨页面 / 跨应用共享）：
        <strong>{{ count }}</strong>
      </p>
      <button class="btn" @click="inc">+1</button>
      <button class="btn btn-ghost" @click="reset">清零</button>
    </div>
  </div>
</template>

<script>
// 共享状态统一走 @fmac/core 的 store。
import { store } from '@fmac/core';

const COUNT_KEY = 'demo:count';

export default {
  name: 'HomeView',
  data() {
    return {
      count: store.get(COUNT_KEY) || 0,
      off: null,
    };
  },
  created() {
    this.off = store.subscribe(COUNT_KEY, (value) => {
      this.count = value || 0;
    });
  },
  beforeDestroy() {
    if (this.off) this.off();
  },
  methods: {
    inc() {
      store.set(COUNT_KEY, (store.get(COUNT_KEY) || 0) + 1);
    },
    reset() {
      store.set(COUNT_KEY, 0);
    },
  },
};
</script>

<style scoped>
.page {
  max-width: 720px;
}
.card {
  margin-top: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.btn {
  margin-right: 8px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
}
.btn-ghost {
  background: #f1f5f9;
  color: #334155;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
