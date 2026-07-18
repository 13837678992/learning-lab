<template>
  <div class="page">
    <h2>账户管理</h2>

    <div v-if="!canRead" class="denied">当前用户缺少「account:read」权限（读取自共享 store）。</div>

    <template v-else>
      <div class="bar">
        <button class="fbtn" @click="reload">刷新</button>
        <button class="fbtn ghost" @click="toUser">在用户中心查看持有人 →</button>
      </div>
      <table class="ftbl">
        <thead>
          <tr>
            <th>账户号</th>
            <th>名称</th>
            <th>开户行</th>
            <th>余额</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accounts" :key="a.id">
            <td>{{ a.id }}</td>
            <td>{{ a.name }}</td>
            <td>{{ a.bank }}</td>
            <td>{{ a.currency }} {{ a.balance.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<script>
import { fetchAccounts } from '../../api/index.js';
import { getStore, getLoading, getSharedRouter, openTab } from '../../platform.js';

export default {
  name: 'AccountList',
  data() {
    return { accounts: [] };
  },
  computed: {
    canRead() {
      return (getStore().get('finance:permissions') || []).includes('account:read');
    },
  },
  created() {
    openTab('/account', '账户管理');
    if (this.canRead) this.reload();
  },
  methods: {
    async reload() {
      // Request + Loading：经 SDK 请求并包裹全局 loading。
      this.accounts = await getLoading().withLoading(() => fetchAccounts(), { text: '加载账户…' });
    },
    toUser() {
      // 跨应用跳转（router SDK）。
      getSharedRouter().push('/micro/user');
    },
  },
};
</script>

<style scoped>
.bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.denied {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
}
</style>
