<template>
  <div class="control-panel" v-if="totalChunks > 0">
    <div class="size-info">
      <div class="size-item">
        <span class="label">文本大小</span>
        <span class="value">{{ formatSize(originalSize) }}</span>
      </div>
      <div class="size-item">
        <span class="label">二维码数量</span>
        <span class="value">{{ totalChunks }}</span>
      </div>
    </div>

    <div class="controls">
      <button class="ctrl-btn" @click="$emit('prev')" :disabled="currentIndex === 0">
        ◀ 上一张
      </button>
      <button class="ctrl-btn play-btn" @click="$emit('toggle-play')">
        {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
      </button>
      <button class="ctrl-btn" @click="$emit('next')" :disabled="currentIndex >= totalChunks - 1">
        下一张 ▶
      </button>
    </div>

    <div class="speed-controls">
      <span class="speed-label">播放速度:</span>
      <button
        v-for="speed in speeds"
        :key="speed.value"
        class="speed-btn"
        :class="{ active: playSpeed === speed.value }"
        @click="$emit('set-speed', speed.value)"
      >
        {{ speed.label }}
      </button>
    </div>

    <div class="qr-size-controls">
      <span class="speed-label">二维码尺寸:</span>
      <button
        v-for="size in sizes"
        :key="size.value"
        class="speed-btn"
        :class="{ active: qrSize === size.value }"
        @click="$emit('set-size', size.value)"
      >
        {{ size.label }}
      </button>
    </div>

    <div class="chunk-counter">
      当前: {{ currentIndex + 1 }} / {{ totalChunks }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'ControlPanel',
  props: {
    totalChunks: { type: Number, default: 0 },
    currentIndex: { type: Number, default: 0 },
    isPlaying: { type: Boolean, default: false },
    playSpeed: { type: Number, default: 1000 },
    qrSize: { type: Number, default: 500 },
    originalSize: { type: Number, default: 0 },
  },
  emits: ['prev', 'next', 'toggle-play', 'set-speed', 'set-size'],
  setup() {
    const speeds = [
      { label: '500ms', value: 500 },
      { label: '1s', value: 1000 },
      { label: '2s', value: 2000 },
    ]
    const sizes = [
      { label: '500px', value: 500 },
      { label: '1000px', value: 1000 },
      { label: '1500px', value: 1500 },
    ]

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    }

    return { speeds, sizes, formatSize }
  },
}
</script>

<style scoped>
.control-panel {
  padding: 16px;
  border-top: 1px solid #0f3460;
  background: #16213e;
}

.size-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 12px;
}

.size-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.size-item .label {
  font-size: 11px;
  color: #666;
}

.size-item .value {
  font-size: 14px;
  color: #e94560;
  font-weight: bold;
}

.controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
}

.ctrl-btn {
  padding: 6px 14px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #0d1b2a;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn:hover:not(:disabled) {
  background: #1b2838;
  border-color: #e94560;
}

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.play-btn {
  background: #e94560;
  border-color: #e94560;
  color: white;
}

.play-btn:hover {
  background: #ff6b6b;
}

.speed-controls,
.qr-size-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.speed-label {
  font-size: 12px;
  color: #666;
}

.speed-btn {
  padding: 3px 10px;
  border: 1px solid #333;
  border-radius: 4px;
  background: transparent;
  color: #888;
  font-size: 11px;
  cursor: pointer;
}

.speed-btn.active {
  background: #e94560;
  border-color: #e94560;
  color: white;
}

.chunk-counter {
  text-align: center;
  font-size: 13px;
  color: #666;
  font-family: monospace;
}
</style>
