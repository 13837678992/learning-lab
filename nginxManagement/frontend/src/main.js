import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'


const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(ElementPlus)
app.use(router)

app.mount('#app')
