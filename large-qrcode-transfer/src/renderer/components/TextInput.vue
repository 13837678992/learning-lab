<template>
  <div class="text-input-panel">
    <div class="panel-header">
      <h2>文本输入</h2>
      <div class="stats">
        <span class="stat">字符: {{ charCount }}</span>
        <span class="stat">字节: {{ byteSize }}</span>
      </div>
    </div>
    <textarea
      v-model="localText"
      class="text-area"
      placeholder="输入或粘贴文本内容（支持 Ctrl+V 粘贴）...&#10;&#10;支持中文、英文、特殊字符、emoji 等"
      @input="$emit('update:text', localText)"
    ></textarea>
    <div class="actions">
      <button class="btn btn-primary" @click="$emit('generate')" :disabled="!localText.trim()">
        生成二维码
      </button>
      <button class="btn btn-secondary" @click="$emit('load-clipboard')">
        读取剪贴板
      </button>
      <button class="btn btn-ghost" @click="clearText">
        清空
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'TextInput',
  props: {
    text: { type: String, default: '' },
  },
  emits: ['update:text', 'generate', 'load-clipboard'],
  setup(props, { emit }) {
    const localText = ref(props.text)

    watch(() => props.text, (val) => {
      localText.value = val
    })

    watch(localText, (val) => {
      emit('update:text', val)
    })

    const charCount = computed(() => localText.value.length)
    const byteSize = computed(() => new Blob([localText.value]).size)

    function clearText() {
      localText.value = ''
      emit('update:text', '')
    }

    return { localText, charCount, byteSize, clearText }
  },
}
</script>

<style scoped>
.text-input-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h2 {
  font-size: 14px;
  color: #e94560;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat {
  font-size: 12px;
  color: #888;
  background: #0f3460;
  padding: 2px 8px;
  border-radius: 4px;
}

.text-area {
  flex: 1;
  min-height: 200px;
  background: #0d1b2a;
  border: 1px solid #1b2838;
  border-radius: 8px;
  padding: 12px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.text-area:focus {
  border-color: #e94560;
}

.text-area::placeholder {
  color: #444;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #e94560;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #ff6b6b;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #0f3460;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background: #1a4a7a;
}

.btn-ghost {
  background: transparent;
  color: #888;
  border: 1px solid #333;
}

.btn-ghost:hover {
  color: #e0e0e0;
  border-color: #555;
}
</style>
