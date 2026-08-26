import CryptoJS from 'crypto-js'

export function computeChecksum(data) {
  return CryptoJS.MD5(data).toString()
}

export function verifyChecksum(data, expectedChecksum) {
  const actual = computeChecksum(data)
  return actual === expectedChecksum
}
