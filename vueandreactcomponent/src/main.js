import Vue from 'vue'
import App from './App.vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

// 手动补充 Vue 2 缺失的 mergeProps 方法（适配 @vue/babel-plugin-jsx）
Vue.config.globalProperties = Vue.config.globalProperties || {}
Vue.config.globalProperties.$mergeProps = function mergeProps(...args) {
  return args.reduce((acc, props) => {
    if (!props) return acc
    Object.keys(props).forEach(key => {
      if (key === 'class' || key === 'style') {
        acc[key] = acc[key] ? `${acc[key]} ${props[key]}` : props[key]
      } else if (key.startsWith('on')) {
        acc[key] = acc[key]
          ? [...(Array.isArray(acc[key]) ? acc[key] : [acc[key]]), props[key]]
          : props[key]
      } else {
        acc[key] = props[key] !== undefined ? props[key] : acc[key]
      }
    })
    return acc
  }, {})
}

Vue.use(ElementUI)
Vue.config.productionTip = false

// 若插件内部从 vue 导入 mergeProps，需额外挂载到 Vue 模块
import * as VueModule from 'vue'
if (!VueModule.mergeProps) {
  VueModule.mergeProps = Vue.config.globalProperties.$mergeProps
}

new Vue({
  render: h => h(App),
}).$mount('#app')
