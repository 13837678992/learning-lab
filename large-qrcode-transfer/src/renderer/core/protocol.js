export function buildProtocolFrame({ id, index, total, checksum, data }) {
  return {
    app: 'large-qrcode-transfer',
    version: '1.0',
    id,
    index,
    total,
    checksum,
    data,
  }
}

export function parseProtocolFrame(jsonString) {
  const frame = JSON.parse(jsonString)
  if (frame.app !== 'large-qrcode-transfer') {
    throw new Error('Invalid protocol: unknown app')
  }
  if (frame.version !== '1.0') {
    throw new Error('Invalid protocol: unsupported version')
  }
  return frame
}

export function validateFrame(frame) {
  return (
    frame &&
    frame.app === 'large-qrcode-transfer' &&
    frame.version === '1.0' &&
    typeof frame.id === 'string' &&
    typeof frame.index === 'number' &&
    typeof frame.total === 'number' &&
    typeof frame.checksum === 'string' &&
    typeof frame.data === 'string' &&
    frame.index >= 1 &&
    frame.index <= frame.total
  )
}
