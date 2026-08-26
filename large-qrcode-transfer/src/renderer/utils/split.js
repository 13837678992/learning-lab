const MAX_BYTES = 1200

export function splitPlainText(text) {
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
