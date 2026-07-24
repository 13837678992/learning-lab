<template>
  <div class="home">
    <section class="hero">
      <h1>欢迎，{{ displayName }}</h1>
      <p>FMAC 微前端主应用（基座）· Phase 2 能力已就绪。</p>
    </section>

    <section class="cards">
      <div class="card">
        <div class="card__label">运行环境</div>
        <div class="card__value">{{ appMode }}</div>
      </div>
      <div class="card">
        <div class="card__label">已注册子应用</div>
        <div class="card__value">{{ microApps.length }}</div>
      </div>
      <div class="card">
        <div class="card__label">菜单项</div>
        <div class="card__value">{{ menu.length }}</div>
      </div>
    </section>

    <section class="panel">
      <h3>子应用</h3>
      <ul v-if="microApps.length">
        <li v-for="app in microApps" :key="app.name">
          <router-link :to="app.activeRule">{{ app.name }}</router-link>
          <span class="muted">（entry: {{ app.entry }}）</span>
        </li>
      </ul>
      <p v-else class="muted">暂无已注册子应用。</p>
    </section>
  </div>
</template>

<script>
import { store } from '@/store';

export default {
  name: 'Home',
  computed: {
    displayName() {
      const u = store.state.userInfo;
      return (u && (u.name || u.username)) || '访客';
    },
    appMode() {
      return process.env.APP_MODE;
    },
    menu() {
      return store.state.menu;
    },
    microApps() {
      return store.state.microApps;
    },
  },
};
</script>

<style scoped>
.home {
  max-width: 960px;
}
.hero {
  padding: 24px 28px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.hero h1 {
  margin: 0 0 6px;
  font-size: 22px;
}
.hero p {
  margin: 0;
  color: #86909c;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 16px 0;
}
.card {
  padding: 18px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.card__label {
  color: #86909c;
  font-size: 13px;
}
.card__value {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 700;
}
.panel {
  padding: 20px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.panel h3 {
  margin-top: 0;
}
.panel ul {
  line-height: 2;
  padding-left: 18px;
}
.muted {
  color: #86909c;
}
</style>
