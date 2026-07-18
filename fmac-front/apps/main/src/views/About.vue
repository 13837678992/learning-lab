<template>
  <div class="page">
    <h2>关于</h2>
    <p>FMAC Front 企业级微前端平台 · 主应用（基座）。</p>
    <ul>
      <li>主框架：Vue 2.7 + vue-router 3 + Vite</li>
      <li>微前端：qiankun（由 <code>@fmac/core</code> 统一托管，强制样式隔离）</li>
      <li>
        平台能力：router / store / request / event / loading / message / cache / auth / tab （均经
        <code>@fmac/core</code> 接入）
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'AboutView',
};
</script>

<style scoped>
.page {
  max-width: 720px;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
