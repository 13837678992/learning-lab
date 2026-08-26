<template>
  <div class="qrcode-viewer">
    <div v-if="!qrDataUrl" class="placeholder">
      <div class="placeholder-icon">&#9635;</div>
      <p>输入文本后点击"生成二维码"</p>
      <p class="hint">大文本将自动分片为多个二维码，扫码直接显示原文</p>
    </div>
    <div v-else class="qr-display">
      <div class="qr-frame">
        <img :src="qrDataUrl" alt="QR Code" class="qr-image" />
      </div>
      <div v-if="chunkInfo" class="chunk-info">
        <div class="chunk-label">
          第 <span class="highlight">{{ chunkInfo.index }}</span> / {{ chunkInfo.total }} 张
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: (chunkInfo.index / chunkInfo.total * 100) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'QrcodeViewer',
  props: {
    qrDataUrl: { type: String, default: '' },
    chunkInfo: { type: Object, default: null },
  },
}
</script>

<style scoped>
.qrcode-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.placeholder {
  text-align: center;
  color: #555;
}

.placeholder-icon {
  font-size: 80px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.placeholder p {
  margin: 4px 0;
  font-size: 14px;
}

.hint {
  font-size: 12px;
  color: #444;
}

.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-frame {
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(233, 69, 96, 0.15);
}

.qr-image {
  display: block;
  max-width: 400px;
  max-height: 400px;
  image-rendering: pixelated;
}

.chunk-info {
  text-align: center;
  width: 100%;
  max-width: 400px;
}

.chunk-label {
  font-size: 14px;
  margin-bottom: 8px;
  color: #aaa;
}

.highlight {
  color: #e94560;
  font-weight: bold;
  font-size: 16px;
}

.progress-bar {
  height: 4px;
  background: #1b2838;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e94560, #ff6b6b);
  transition: width 0.3s;
  border-radius: 2px;
}
</style>
