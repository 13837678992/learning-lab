<template>
  <div class="page">
    <button class="back" @click="back">← 返回</button>
    <h2>报表详情</h2>
    <p class="hint">数据经 <code>@fmac/core</code> 的 request 获取（无后端时回退本地模拟）。</p>
    <table class="tbl">
      <thead>
        <tr>
          <th>指标</th>
          <th>数值</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label">
          <td>{{ row.label }}</td>
          <td>{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { request, router } from '../platform.js';

const MOCK_ROWS = [
  { label: '今日订单数', value: 128 },
  { label: '活跃用户数', value: 542 },
  { label: '成交金额', value: '￥86,300' },
];

export default {
  name: 'ReportDetail',
  data() {
    return { rows: [] };
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      try {
        this.rows = await request.get('/summary');
      } catch (error) {
        this.rows = MOCK_ROWS;
      }
    },
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
.hint {
  color: #64748b;
  font-size: 13px;
}
.tbl {
  border-collapse: collapse;
  max-width: 480px;
  width: 100%;
  background: #fff;
}
.tbl th,
.tbl td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
  font-size: 14px;
}
.tbl th {
  background: #f8fafc;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
