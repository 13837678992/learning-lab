import init, { resize_png } from '../wasm/wasm_thumb/wasm_thumb.js'

let ready = false

async function ensureInit() {
  if (!ready) {
    await init()
    ready = true
  }
}

onmessage = async e => {
  const { index, blob } = e.data

  if (!blob) {
    console.warn('[worker] 收到空 blob:', index)
    return
  }

  await ensureInit()

  const buffer = await blob.arrayBuffer()
  const out = resize_png(new Uint8Array(buffer), 200, 250)

  postMessage({
    index,
    blob: new Blob([out], { type: 'image/png' }),
  })
}
