import QRCode from 'qrcode'

const MAX_BYTES = 1200

const els = {
  textInput: document.getElementById('text-input'),
  charCount: document.getElementById('char-count'),
  byteSize: document.getElementById('byte-size'),
  statusLine: document.getElementById('status-line'),
  btnGenerate: document.getElementById('btn-generate'),
  btnClipboard: document.getElementById('btn-clipboard'),
  btnClear: document.getElementById('btn-clear'),
  controlPanel: document.getElementById('control-panel'),
  origSize: document.getElementById('orig-size'),
  chunkTotal: document.getElementById('chunk-total'),
  btnPrev: document.getElementById('btn-prev'),
  btnPlay: document.getElementById('btn-play'),
  btnNext: document.getElementById('btn-next'),
  chunkIndex: document.getElementById('chunk-index'),
  chunkTotal2: document.getElementById('chunk-total-2'),
  placeholder: document.getElementById('placeholder'),
  qrDisplay: document.getElementById('qr-display'),
  qrImage: document.getElementById('qr-image'),
  qrIndex: document.getElementById('qr-index'),
  qrTotal: document.getElementById('qr-total'),
  progressFill: document.getElementById('progress-fill'),
  btnExport: document.getElementById('btn-export'),
}

const state = {
  chunks: [],
  index: 0,
  isPlaying: false,
  playSpeed: 1000,
  qrSize: 500,
  playTimer: null,
}

function splitPlainText(text) {
  const encoder = new TextEncoder()
  const codePoints = Array.from(text)
  const total = codePoints.length
  const chunks = []
  let start = 0

  while (start < total) {
    const slice = codePoints.slice(start)
    if (encoder.encode(slice.join('')).length <= MAX_BYTES) {
      chunks.push(slice.join(''))
      break
    }

    let lo = 1, hi = slice.length, bestLen = 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const byteLen = encoder.encode(slice.slice(0, mid).join('')).length
      if (byteLen <= MAX_BYTES) {
        bestLen = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    chunks.push(slice.slice(0, bestLen).join(''))
    start += bestLen
  }

  if (chunks.length === 0) {
    chunks.push(text)
  }

  return chunks
}

async function generateQrCode(text, size) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: size,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function setStatus(msg) {
  els.statusLine.textContent = msg
}

function stopPlay() {
  state.isPlaying = false
  if (state.playTimer) {
    clearInterval(state.playTimer)
    state.playTimer = null
  }
  renderPanel()
}

function prevChunk() {
  if (state.index > 0) {
    state.index--
    renderViewer()
    renderPanel()
  }
}

function nextChunk() {
  if (state.index < state.chunks.length - 1) {
    state.index++
    renderViewer()
    renderPanel()
  }
}

function togglePlay() {
  if (state.isPlaying) {
    stopPlay()
    return
  }
  if (state.chunks.length <= 1) return
  state.isPlaying = true
  state.playTimer = setInterval(() => {
    if (state.index < state.chunks.length - 1) {
      state.index++
    } else {
      state.index = 0
    }
    renderViewer()
    renderPanel()
  }, state.playSpeed)
  renderPanel()
}

function renderViewer() {
  if (state.chunks.length === 0) {
    els.placeholder.hidden = false
    els.qrDisplay.hidden = true
    return
  }
  els.placeholder.hidden = true
  els.qrDisplay.hidden = false
  els.qrImage.src = state.chunks[state.index].qrDataUrl
  els.qrIndex.textContent = state.index + 1
  els.qrTotal.textContent = state.chunks.length
  els.progressFill.style.width = ((state.index + 1) / state.chunks.length) * 100 + '%'
}

function renderPanel() {
  const total = state.chunks.length
  els.controlPanel.hidden = total === 0
  els.origSize.textContent = formatSize(new Blob([els.textInput.value]).size)
  els.chunkTotal.textContent = total
  els.chunkTotal2.textContent = total
  els.chunkIndex.textContent = state.index + 1
  els.btnPrev.disabled = state.index === 0
  els.btnNext.disabled = state.index >= total - 1
  els.btnPlay.textContent = state.isPlaying ? '⏸ 暂停' : '▶ 播放'
  els.btnPlay.disabled = total <= 1 && !state.isPlaying
  for (const btn of speedBtns) {
    btn.classList.toggle('active', Number(btn.dataset.speed) === state.playSpeed)
  }
  for (const btn of sizeBtns) {
    btn.classList.toggle('active', Number(btn.dataset.size) === state.qrSize)
  }
}

function updateStats() {
  els.charCount.textContent = els.textInput.value.length
  els.byteSize.textContent = new Blob([els.textInput.value]).size
  els.btnGenerate.disabled = !els.textInput.value.trim()
  if (!els.textInput.value) {
    stopPlay()
    state.chunks = []
    state.index = 0
    renderViewer()
    renderPanel()
  } else {
    renderPanel()
  }
}

async function handleGenerate() {
  const source = els.textInput.value
  if (!source) return
  stopPlay()

  const parts = splitPlainText(source)
  if (parts.join('') !== source) {
    setStatus('分片校验失败，请重试')
    return
  }

  els.btnGenerate.disabled = true
  setStatus('正在生成二维码...')
  const chunks = []
  for (const part of parts) {
    chunks.push({ data: part, qrDataUrl: await generateQrCode(part, state.qrSize) })
  }
  state.chunks = chunks
  state.index = 0
  renderViewer()
  renderPanel()
  els.btnGenerate.disabled = false
  setStatus(`已生成 ${chunks.length} 张二维码`)
}

async function handleLoadClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    setStatus('当前环境不支持读取剪贴板，请直接 Ctrl+V 粘贴')
    return
  }
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      els.textInput.value = text
      updateStats()
      setStatus(`读取成功：${text.length} 字符，${formatSize(new Blob([text]).size)}`)
    } else {
      setStatus('剪贴板为空')
    }
  } catch (err) {
    setStatus('浏览器限制剪贴板读取（file:// 打开时常见），请直接 Ctrl+V 粘贴')
  }
}

function handleClear() {
  els.textInput.value = ''
  updateStats()
  setStatus('')
}

async function setSpeed(speed) {
  state.playSpeed = speed
  if (state.isPlaying) {
    stopPlay()
    state.isPlaying = true
    state.playTimer = setInterval(() => {
      if (state.index < state.chunks.length - 1) {
        state.index++
      } else {
        state.index = 0
      }
      renderViewer()
      renderPanel()
    }, state.playSpeed)
  }
  renderPanel()
}

async function setSize(size) {
  state.qrSize = size
  renderPanel()
  if (state.chunks.length > 0) {
    await handleGenerate()
  }
}

function exportPng() {
  const chunk = state.chunks[state.index]
  if (!chunk) return
  const a = document.createElement('a')
  a.href = chunk.qrDataUrl
  a.download = `transfer-${String(state.index + 1).padStart(3, '0')}.png`
  a.click()
}

const speedBtns = [...document.querySelectorAll('.speed-btn[data-speed]')]
const sizeBtns = [...document.querySelectorAll('.speed-btn[data-size]')]

function init() {
  els.textInput.addEventListener('input', updateStats)
  els.btnGenerate.addEventListener('click', handleGenerate)
  els.btnClipboard.addEventListener('click', handleLoadClipboard)
  els.btnClear.addEventListener('click', handleClear)
  els.btnPrev.addEventListener('click', prevChunk)
  els.btnNext.addEventListener('click', nextChunk)
  els.btnPlay.addEventListener('click', togglePlay)
  els.btnExport.addEventListener('click', exportPng)
  for (const btn of speedBtns) {
    btn.addEventListener('click', () => setSpeed(Number(btn.dataset.speed)))
  }
  for (const btn of sizeBtns) {
    btn.addEventListener('click', () => setSize(Number(btn.dataset.size)))
  }
  document.addEventListener('keydown', (e) => {
    if (state.chunks.length <= 1) return
    if (e.key === 'ArrowLeft') prevChunk()
    else if (e.key === 'ArrowRight') nextChunk()
  })
  renderViewer()
  renderPanel()
}

init()
