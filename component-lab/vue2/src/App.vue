<template>
  <div id="app">
    <header class="app-header">
      <h1>Component Lab</h1>
      <p class="subtitle">Vue 2.7 组件实验场</p>
    </header>
    <main class="app-main">
      <section class="demo-section">
        <h2>BaseButton 组件</h2>
        <div class="demo-row">
          <BaseButton label="默认按钮" />
          <BaseButton label="主要按钮" variant="primary" />
          <BaseButton label="危险按钮" variant="danger" />
          <BaseButton label="禁用按钮" disabled />
        </div>
        <p class="counter">点击次数：{{ count }}</p>
      </section>
      <section class="demo-section crud-section">
        <CrudDemo />
      </section>
      <section class="demo-section crud-section">
        <FormDemo />
      </section>
    </main>
  </div>
</template>

<script>
import BaseButton from './components/BaseButton.vue'
import CrudDemo from './demo/CrudDemo.vue'
import FormDemo from './demo/FormDemo.vue'

export default {
  name: 'App',
  components: { BaseButton, CrudDemo, FormDemo },
  data() {
    return { count: 0 }
  },
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app-header {
  text-align: center;
  padding: 2rem 1rem;
  background: #42b883;
  color: #fff;
}

.app-header h1 {
  font-size: 1.8rem;
}

.subtitle {
  margin-top: 0.4rem;
  opacity: 0.85;
}

.app-main {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.demo-section {
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.demo-section h2 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.crud-section {
  margin-top: 1.5rem;
}

.counter {
  margin-top: 1rem;
  color: #666;
}
</style>
