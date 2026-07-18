<template>
  <div class="page">
    <h2>交易流水</h2>

    <form class="search" @submit.prevent="doSearch">
      <input v-model="keyword" placeholder="对手方关键字" />
      <select v-model="type">
        <option value="all">全部</option>
        <option value="in">收入</option>
        <option value="out">支出</option>
      </select>
      <button class="fbtn" type="submit">查询</button>
      <span class="cache-tip">搜索条件已缓存（切走再回来会保留）</span>
    </form>

    <table class="ftbl">
      <thead>
        <tr>
          <th>流水号</th>
          <th>日期</th>
          <th>类型</th>
          <th>金额</th>
          <th>对手方</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in list" :key="t.id">
          <td>{{ t.id }}</td>
          <td>{{ t.date }}</td>
          <td>{{ t.type === 'in' ? '收入' : '支出' }}</td>
          <td>{{ t.amount.toLocaleString() }}</td>
          <td>{{ t.counterparty }}</td>
        </tr>
      </tbody>
    </table>

    <button class="fbtn ghost" @click="notifyUpdate">上报变更（emit finance:update）</button>
  </div>
</template>

<script>
import { fetchTransactions } from '../../api/index.js';
import { cache, getLoading, getEvent, getTab, getMessage, openTab } from '../../platform.js';

const CACHE_KEY = 'finance:tx:search';
const TAB_KEY = '/finance/transaction';

export default {
  name: 'TransactionList',
  data() {
    // Cache：进入时恢复上次搜索条件。
    const saved = cache.get(CACHE_KEY, { keyword: '', type: 'all' });
    return { keyword: saved.keyword, type: saved.type, list: [], offTab: null };
  },
  created() {
    openTab('/transaction', '交易流水');
    this.doSearch();
    // Tab · 刷新：监听标签刷新事件，重载当前页数据。
    this.offTab = getTab().subscribe(({ type, payload }) => {
      if (type === 'refresh' && payload && payload.key === TAB_KEY) this.doSearch();
    });
  },
  watch: {
    keyword() {
      this.persist();
    },
    type() {
      this.persist();
    },
  },
  beforeDestroy() {
    // §12：持久化搜索条件 + 清理订阅。
    this.persist();
    if (this.offTab) this.offTab();
  },
  methods: {
    persist() {
      cache.set(CACHE_KEY, { keyword: this.keyword, type: this.type });
    },
    async doSearch() {
      this.list = await getLoading().withLoading(() =>
        fetchTransactions({ keyword: this.keyword, type: this.type }),
      );
    },
    notifyUpdate() {
      // Event：向主应用广播 finance:update。
      getEvent().emit('finance:update', { module: 'transaction', at: Date.now() });
      getMessage().success('已上报 finance:update');
    },
  },
};
</script>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.search input,
.search select {
  padding: 6px 10px;
  border: 1px solid #ddd6fe;
  border-radius: 6px;
}
.cache-tip {
  font-size: 12px;
  color: #7c3aed;
}
</style>
