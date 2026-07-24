<template>
  <div class="home">
    <h2>子应用首页</h2>

    <section class="ctx">
      <h4>来自主应用的上下文（onGlobalStateChange 同步）</h4>
      <ul>
        <li>token：<code>{{ token || '（无）' }}</code></li>
        <li>用户：{{ userName || '（无）' }}</li>
        <li>菜单数：{{ menuCount }}</li>
        <li>最近全局刷新：{{ lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : '（无）' }}</li>
      </ul>
    </section>

    <section class="block">
      <h4>数据请求（子应用独立 request.js）</h4>
      <div class="actions">
        <button @click="loadSummary">加载示例数据</button>
        <button class="warn" @click="testExpire">模拟 418 → 通知主应用退出</button>
        <button class="warn" @click="testUnauth">模拟 401 → 未登录</button>
      </div>
      <pre v-if="summary" class="result">{{ summaryText }}</pre>
    </section>

    <section class="block">
      <h4>子 → 主 通信（setGlobalState 上行 action）</h4>
      <div class="actions">
        <button @click="notifyRoute">通知主应用跳转 /home</button>
        <button @click="notifyRefresh">触发全局刷新</button>
        <button class="warn" @click="notifyLogout">退出登录</button>
      </div>
    </section>
  </div>
</template>

<script>
import { getContext, emitToMain } from '@/context';
import { getSummary, triggerExpire, triggerUnauth } from '@/api';

export default {
  name: 'Home',
  data() {
    return { summary: null };
  },
  computed: {
    token() {
      return getContext().token;
    },
    userName() {
      const u = getContext().userInfo;
      return u && (u.name || u.username);
    },
    menuCount() {
      return (getContext().menu || []).length;
    },
    lastRefresh() {
      return getContext().lastRefresh;
    },
    summaryText() {
      return JSON.stringify(this.summary, null, 2);
    },
  },
  methods: {
    async loadSummary() {
      try {
        this.summary = await getSummary();
      } catch (e) {
        /* 演示用 */
      }
    },
    async testExpire() {
      try {
        await triggerExpire();
      } catch (e) {
        /* 418 已由拦截器触发 window.microApp.logout() */
      }
    },
    async testUnauth() {
      try {
        await triggerUnauth();
      } catch (e) {
        /* 401 已由拦截器处理 */
      }
    },
    notifyRoute() {
      emitToMain({ type: 'route', payload: '/home' });
    },
    notifyRefresh() {
      emitToMain({ type: 'refresh' });
    },
    notifyLogout() {
      emitToMain({ type: 'logout' });
    },
  },
};
</script>

<style scoped>
.home {
  max-width: 760px;
}
.home h2 {
  margin-top: 0;
}
.ctx,
.block {
  margin-top: 16px;
}
.ctx {
  padding: 12px 16px;
  background: #f2fbf8;
  border: 1px solid #cdeee5;
  border-radius: 8px;
}
.ctx h4,
.block h4 {
  margin: 0 0 8px;
}
.ctx ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.9;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.actions button {
  height: 34px;
  padding: 0 14px;
  border: 1px solid #0e7a6b;
  background: #0e7a6b;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}
.actions button.warn {
  background: #fff;
  color: #e37318;
  border-color: #e37318;
}
.result {
  margin-top: 12px;
  padding: 12px;
  background: #0f172a;
  color: #a7f3d0;
  border-radius: 8px;
  overflow: auto;
}
</style>
