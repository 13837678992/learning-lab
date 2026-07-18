<template>
  <div class="page">
    <h2>用户管理</h2>
    <p class="hint">数据经 <code>@fmac/core</code> 的 request 获取（无后端时回退本地模拟）。</p>
    <ul class="list">
      <li v-for="user in users" :key="user.id" class="row" @click="open(user)">
        <span class="name">{{ user.name }}</span>
        <span class="role">{{ user.role }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
// 业务仅通过子应用 platform 门面访问平台能力（其内部只依赖 @fmac/core）。
import { request, router, getStore, getEvent } from '../platform.js';

const MOCK_USERS = [
  { id: 1, name: '张三', role: '管理员' },
  { id: 2, name: '李四', role: '运营' },
  { id: 3, name: '王五', role: '访客' },
];

export default {
  name: 'UserList',
  data() {
    return { users: [] };
  },
  created() {
    this.load();
  },
  methods: {
    async load() {
      try {
        this.users = await request.get('/list');
      } catch (error) {
        // 无后端时回退模拟数据，保证 UI 可用。
        this.users = MOCK_USERS;
      }
    },
    open(user) {
      // store：写入当前用户（跨应用共享）；event：广播选择事件（供 report 等子应用消费）。
      getStore().set('current:user', user);
      getEvent().emit('user:selected', user);
      // router：统一走 @fmac/core 的 router（禁止 this.$router，见 CLAUDE.md 第十节）。
      router.push(`/detail/${user.id}`);
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
  max-width: 520px;
}
.row {
  display: flex;
  justify-content: space-between;
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
.role {
  color: #64748b;
  font-size: 13px;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
