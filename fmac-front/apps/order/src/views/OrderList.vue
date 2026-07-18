<template>
  <div class="page">
    <h2>订单管理</h2>
    <p class="hint">
      点击订单查看详情；选择会写入共享 <code>store</code> 并广播 <code>event</code>。
    </p>
    <ul class="list">
      <li v-for="order in orders" :key="order.id" class="row" @click="open(order)">
        <span class="no">#{{ order.id }}</span>
        <span class="title">{{ order.title }}</span>
        <span class="amount">￥{{ order.amount }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { request, router, getStore, getEvent } from '../platform.js';

const MOCK_ORDERS = [
  { id: 1001, title: '企业年费套餐', amount: 1299 },
  { id: 1002, title: '增值服务包', amount: 399 },
  { id: 1003, title: '定制开发', amount: 8800 },
];

export default {
  name: 'OrderList',
  data() {
    return { orders: [] };
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      try {
        this.orders = await request.get('/list');
      } catch (error) {
        this.orders = MOCK_ORDERS;
      }
    },
    open(order) {
      getStore().set('current:order', order);
      getEvent().emit('order:opened', order);
      router.push(`/detail/${order.id}`);
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
.list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  max-width: 560px;
}
.row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  background: #fff;
}
.row:hover {
  border-color: #93c5fd;
}
.no {
  color: #64748b;
  font-size: 13px;
}
.amount {
  color: #dc2626;
  font-weight: 600;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
