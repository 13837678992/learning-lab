<template>
  <div class="app-container">
    <header class="app-header">
      <h1>大容量二维码文本传输工具</h1>
      <span class="version">v1.0.0</span>
    </header>
    <main class="app-main">
      <div class="left-panel">
        <TextInput
          v-model:text="inputText"
          @generate="handleGenerate"
          @load-clipboard="handleLoadClipboard"
        />
        <ControlPanel
          :total-chunks="totalChunks"
          :current-index="currentIndex"
          :is-playing="isPlaying"
          :play-speed="playSpeed"
          :qr-size="qrSize"
          :original-size="originalSize"
          @prev="prevChunk"
          @next="nextChunk"
          @toggle-play="togglePlay"
          @set-speed="setSpeed"
          @set-size="setSize"
        />
      </div>
      <div class="right-panel">
        <QrcodeViewer
          :qr-data-url="currentQrDataUrl"
          :chunk-info="chunkInfo"
        />
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, watch, onUnmounted } from 'vue'
import TextInput from './components/TextInput.vue'
import QrcodeViewer from './components/QrcodeViewer.vue'
import ControlPanel from './components/ControlPanel.vue'
import { splitPlainText } from './utils/split.js'
import { generateQrCode } from './core/encoder.js'

export default {
  name: 'App',
  components: { TextInput, QrcodeViewer, ControlPanel },
  setup() {
    const inputText = ref('')
    const chunks = ref([])
    const currentIndex = ref(0)
    const isPlaying = ref(false)
    const playSpeed = ref(1000)
    const qrSize = ref(500)
    let playTimer = null

    const totalChunks = computed(() => chunks.value.length)
    const originalSize = computed(() => new Blob([inputText.value]).size)

    const chunkInfo = computed(() => {
      if (totalChunks.value === 0) return null
      return {
        index: currentIndex.value + 1,
        total: totalChunks.value,
      }
    })

    const currentQrDataUrl = computed(() => {
      if (chunks.value.length === 0) return ''
      const chunk = chunks.value[currentIndex.value]
      if (!chunk) return ''
      return chunk.qrDataUrl || ''
    })

    async function handleGenerate() {
      if (!inputText.value) return
      stopPlay()

      const source = inputText.value
      const textParts = splitPlainText(source)

      console.log(`二维码数量: ${textParts.length}`)
      textParts.forEach((chunk, i) => {
        console.log(`chunk${i + 1}: ${chunk.length} 字符, ${new Blob([chunk]).size} 字节`)
      })

      const joined = textParts.join('')
      console.log(`最后校验: chunks.join('').length(${joined.length}) === source.length(${source.length}) => ${joined === source}`)

      if (joined !== source) {
        console.error('分片校验失败！chunk拼接结果与原文不一致')
        return
      }

      const qrChunks = []
      for (const part of textParts) {
        const qrDataUrl = await generateQrCode(part, qrSize.value)
        qrChunks.push({ data: part, qrDataUrl })
      }

      chunks.value = qrChunks
      currentIndex.value = 0
    }

    async function handleLoadClipboard() {
      if (window.electronAPI) {
        const result = await window.electronAPI.clipboard.readText()
        if (result.success) {
          inputText.value = result.data
        }
      }
    }

    function prevChunk() {
      if (currentIndex.value > 0) currentIndex.value--
    }

    function nextChunk() {
      if (currentIndex.value < totalChunks.value - 1) currentIndex.value++
    }

    function stopPlay() {
      isPlaying.value = false
      if (playTimer) {
        clearInterval(playTimer)
        playTimer = null
      }
    }

    function togglePlay() {
      if (isPlaying.value) {
        stopPlay()
      } else {
        if (totalChunks.value <= 1) return
        isPlaying.value = true
        playTimer = setInterval(() => {
          if (currentIndex.value < totalChunks.value - 1) {
            currentIndex.value++
          } else {
            currentIndex.value = 0
          }
        }, playSpeed.value)
      }
    }

    function setSpeed(speed) {
      playSpeed.value = speed
      if (isPlaying.value) {
        stopPlay()
        isPlaying.value = true
        playTimer = setInterval(() => {
          if (currentIndex.value < totalChunks.value - 1) {
            currentIndex.value++
          } else {
            currentIndex.value = 0
          }
        }, playSpeed.value)
      }
    }

    async function setSize(size) {
      qrSize.value = size
      if (chunks.value.length > 0) {
        await handleGenerate()
      }
    }

    watch(inputText, () => {
      if (!inputText.value) {
        chunks.value = []
        currentIndex.value = 0
      }
    })

    onUnmounted(() => {
      stopPlay()
    })

    return {
      inputText,
      totalChunks,
      currentIndex,
      isPlaying,
      playSpeed,
      qrSize,
      originalSize,
      currentQrDataUrl,
      chunkInfo,
      handleGenerate,
      handleLoadClipboard,
      prevChunk,
      nextChunk,
      togglePlay,
      setSpeed,
      setSize,
    }
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  overflow: hidden;
  height: 100vh;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
}

.app-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #e94560;
}

.version {
  font-size: 12px;
  color: #666;
  background: #0f3460;
  padding: 2px 8px;
  border-radius: 10px;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 45%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #0f3460;
  overflow-y: auto;
}

.right-panel {
  width: 55%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}
</style>
