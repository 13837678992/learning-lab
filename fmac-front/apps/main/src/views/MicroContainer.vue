<template>
  <div class="micro-hint">
    <h2>子应用区域</h2>
    <p>
      当前路由命中子应用激活规则，内容由 qiankun 挂载到基座的
      <code>#subapp-viewport</code> 容器。
    </p>
    <p class="tip">若下方无内容，请先启动对应子应用（子应用将在后续 Phase 接入）。</p>
  </div>
</template>

<script>
export default {
  name: 'MicroContainer',
};
</script>

<style scoped>
.micro-hint {
  max-width: 720px;
  padding: 16px;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}
.tip {
  color: #94a3b8;
  font-size: 13px;
}
code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
