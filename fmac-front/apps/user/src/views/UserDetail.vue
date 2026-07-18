<template>
  <div class="page">
    <button class="back" @click="back">← 返回</button>
    <h2>用户详情</h2>
    <div v-if="user" class="card">
      <p><b>ID：</b>{{ user.id }}</p>
      <p><b>姓名：</b>{{ user.name }}</p>
      <p><b>角色：</b>{{ user.role }}</p>
    </div>
    <p v-else class="hint">未找到用户（ID：{{ $route.params.id }}）。</p>
  </div>
</template>

<script>
import { router, getStore } from '../platform.js';

export default {
  name: 'UserDetail',
  data() {
    // 读取跨应用共享 store 中的当前用户。
    return { user: getStore().get('current:user') || null };
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
