<template>
  <div class="page">
    <button class="back" @click="back">← 返回</button>
    <h2>订单详情</h2>
    <div v-if="order" class="card">
      <p><b>订单号：</b>#{{ order.id }}</p>
      <p><b>名称：</b>{{ order.title }}</p>
      <p><b>金额：</b>￥{{ order.amount }}</p>
    </div>
    <p v-else class="hint">未找到订单（ID：{{ $route.params.id }}）。</p>
  </div>
</template>

<script>
import { router, getStore } from '../platform.js';

export default {
  name: 'OrderDetail',
  data() {
    return { order: getStore().get('current:order') || null };
  },
  methods: {
    back() {
      router.back();
    },
  },
};
</script>

<style scoped>
.page {
  padding: 16px;
}
.back {
  border: none;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
  padding: 0 0 8px;
}
.card {
  max-width: 420px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}
.hint {
  color: #94a3b8;
}
</style>
