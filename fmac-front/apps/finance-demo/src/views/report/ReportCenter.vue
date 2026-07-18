<template>
  <div class="page">
    <h2>报表中心</h2>

    <div class="cards">
      <div class="card in">
        <div class="num">{{ currency }} {{ (report.income || 0).toLocaleString() }}</div>
        <div class="label">收入</div>
      </div>
      <div class="card out">
        <div class="num">{{ currency }} {{ (report.expense || 0).toLocaleString() }}</div>
        <div class="label">支出</div>
      </div>
      <div class="card net">
        <div class="num">{{ currency }} {{ (report.net || 0).toLocaleString() }}</div>
        <div class="label">净额</div>
      </div>
    </div>

    <table class="ftbl">
      <thead>
        <tr>
          <th>月份</th>
          <th>收入</th>
          <th>支出</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in report.months || []" :key="row.m">
          <td>{{ row.m }} 月</td>
          <td>{{ row.income.toLocaleString() }}</td>
          <td>{{ row.expense.toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    <div class="bar">
      <button class="fbtn" @click="reload">刷新</button>
      <button class="fbtn ghost" @click="simulateError">模拟请求异常</button>
    </div>
  </div>
</template>

<script>
import { fetchReport } from '../../api/index.js';
import { request, getStore, getLoading, getMessage, openTab } from '../../platform.js';

export default {
  name: 'ReportCenter',
  data() {
    return { report: {}, currency: getStore().get('finance:currency') || 'CNY', off: null };
  },
  created() {
    openTab('/report', '报表中心');
    this.reload();
    this.off = getStore().subscribe('finance:currency', (v) => (this.currency = v || 'CNY'));
  },
  beforeDestroy() {
    if (this.off) this.off();
  },
  methods: {
    async reload() {
      this.report = await getLoading().withLoading(() => fetchReport(), { text: '生成报表…' });
    },
    async simulateError() {
      // Request · 异常处理：请求失败经 SDK 抛出，业务捕获并统一提示。
      try {
        await request.get('/__not_exist__', { timeout: 800 });
        getMessage().info('请求成功（意外）');
      } catch (error) {
        getMessage().error('请求异常已捕获：' + (error && error.message ? error.message : error));
      }
    },
  },
};
</script>

<style scoped>
.cards {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.card {
  flex: 0 0 180px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #faf5ff;
  border: 1px solid #ddd6fe;
}
.card .num {
  font-size: 20px;
  font-weight: 700;
}
.card.in .num {
  color: #16a34a;
}
.card.out .num {
  color: #dc2626;
}
.card.net .num {
  color: #7c3aed;
}
.label {
  font-size: 12px;
  color: #6b7280;
}
.bar {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}
</style>
