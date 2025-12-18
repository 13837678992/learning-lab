import Vue from 'vue'

// 多单词组件名（规避 ESLint 报错）
const JsxChildComponent = Vue.component('JsxChildComponent', {
  props: {
    msg: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      childText: '子组件内部文本',
      inputValue: '默认值',
    }
  },
  methods: {
    handleInputChange(e) {
      this.inputValue = e.target.value
      this.$emit('input-change', this.inputValue)
    },
    handleChildClick() {
      this.$emit('child-click')
    },
  },
  // 简洁 JSX 写法（无需 h 函数）
  render() {
    return (
      <div
        class="child-container"
        style={{ margin: '20px 0', padding: '20px', border: '1px solid #eee' }}
      >
        <h3>子组件 - Props 接收：</h3>
        <p>父组件传递的 msg：{this.msg}</p>
        <p>父组件传递的 count：{this.count}</p>

        <h3>子组件 - 自身数据：</h3>
        <p>{this.childText}</p>

        <h3>子组件 - 双向绑定：</h3>
        <input
          v-model={this.inputValue}
          placeholder="输入内容测试v-model"
          style={{ padding: '8px', margin: '10px 0' }}
          onInput={this.handleInputChange}
        />
        <p>输入框值：{this.inputValue}</p>

        <button
          onClick={this.handleChildClick}
          style={{
            padding: '8px 16px',
            background: '#42b983',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          子组件按钮（点击触发父组件事件）
        </button>

        <h3>子组件 - 插槽展示：</h3>
        <div style={{ color: '#999', margin: '10px 0' }}>
          <slot name="custom-slot" />
          <slot />
        </div>
      </div>
    )
  },
})

// 父组件
export default Vue.component('JsxDemo', {
  data() {
    return {
      parentCount: 0,
      parentMsg: 'Hello Vue 2 JSX!',
      inputFromChild: '',
    }
  },
  methods: {
    handleCountAdd() {
      this.parentCount++
    },
    handleChildInput(val) {
      this.inputFromChild = val
    },
    handleChildClick() {
      alert('父组件接收到子组件点击事件！')
    },
  },
  render() {
    return (
      <div class="parent-container" style={{ width: '600px', margin: '50px auto' }}>
        <h2>Vue 2 JSX 验证 Demo</h2>

        <div style={{ margin: '20px 0' }}>
          <p>父组件 Count：{this.parentCount}</p>
          <button
            onClick={this.handleCountAdd}
            style={{
              padding: '8px 16px',
              background: '#2c3e50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            点击增加 Count
          </button>
        </div>

        <JsxChildComponent
          msg={this.parentMsg}
          count={this.parentCount}
          onInput-change={this.handleChildInput}
          onChild-click={this.handleChildClick}
        >
          <template slot="custom-slot">这是父组件传递的具名插槽内容</template>
          <template>这是父组件传递的默认插槽内容</template>
        </JsxChildComponent>

        <div style={{ marginTop: '20px' }}>
          <p>子组件输入框传递的值：{this.inputFromChild || '暂无输入'}</p>
        </div>
      </div>
    )
  },
})
