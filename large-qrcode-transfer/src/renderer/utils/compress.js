import pako from 'pako'

export function compressText(text) {
  const encoder = new TextEncoder()
  const utf8Bytes = encoder.encode(text)
  const compressed = pako.gzip(utf8Bytes)
  const base64 = arrayBufferToBase64(compressed)
  return base64
}

export function decompressText(base64) {
  const compressed = base64ToArrayBuffer(base64)
  const decompressed = pako.ungzip(compressed)
  const decoder = new TextDecoder()
  return decoder.decode(decompressed)
}

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
