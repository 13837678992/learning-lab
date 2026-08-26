import { splitPlainText } from '../src/renderer/utils/split.js'
import { generateQrCode } from '../src/renderer/core/encoder.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ ${message}`)
  } else {
    failed++
    console.log(`  ✗ ${message}`)
  }
}

async function testPlainSplit() {
  console.log('\n--- 纯文本分片测试 ---')

  const shortText = 'Hello World'
  const chunks = splitPlainText(shortText)
  assert(chunks.length === 1, `短文本: 1个分片`)
  assert(chunks[0] === shortText, `短文本: 内容完全一致`)

  const longText = 'A'.repeat(5000)
  const longChunks = splitPlainText(longText)
  assert(longChunks.length > 1, `5000字符: 分为${longChunks.length}个分片`)
  const merged = longChunks.join('')
  assert(merged === longText, `5000字符: 合并后内容完全一致`)
}

async function testChineseSplit() {
  console.log('\n--- 中文分片测试 ---')

  const chineseText = '这是一段中文测试文本'.repeat(200)
  const chunks = splitPlainText(chineseText)
  assert(chunks.length > 1, `中文长文本: 分为${chunks.length}个分片`)
  const merged = chunks.join('')
  assert(merged === chineseText, `中文长文本: 合并后内容完全一致，无乱码`)
}

async function testEmojiSplit() {
  console.log('\n--- Emoji分片测试 ---')

  const emojiText = '😀🎉🚀💡🔥🌟✨🎯🏆💪'.repeat(100)
  const chunks = splitPlainText(emojiText)
  const merged = chunks.join('')
  assert(merged === emojiText, `Emoji长文本: 合并后内容完全一致`)
}

async function testMixedSplit() {
  console.log('\n--- 混合内容分片测试 ---')

  const mixedText = 'export ANTHROPIC_AUTH_TOKEN=test\nexport ANTHROPIC_BASE_URL=https://anyrouter.top\nclaude\n'.repeat(50)
  const chunks = splitPlainText(mixedText)
  const merged = chunks.join('')
  assert(merged === mixedText, `混合内容(含换行/URL/特殊字符): 合并后完全一致`)
}

async function testQrPlainContent() {
  console.log('\n--- 二维码内容为纯文本测试 ---')

  const testText = `export TEST_TOKEN=test
export TEST_URL=https://example.com
claude`

  const qrDataUrl = await generateQrCode(testText)
  assert(qrDataUrl.startsWith('data:image/png;base64,'), '生成有效PNG dataURL')
  assert(!qrDataUrl.includes('"app"'), '二维码数据不含JSON协议头')
  assert(!qrDataUrl.includes('"checksum"'), '二维码数据不含checksum')

  const qrLib = await import('qrcode')
  const rawMatrix = await qrLib.default.create(testText, { errorCorrectionLevel: 'M' })
  assert(rawMatrix.segments.length >= 1, '二维码编码段数 >= 1')
  const decoder = new TextDecoder()
  const encodedText = rawMatrix.segments.map(s =>
    typeof s.data === 'string' ? s.data : decoder.decode(s.data)
  ).join('')
  assert(encodedText === testText, '扫码内容与输入文本完全一致')
}

async function testQrSizes() {
  console.log('\n--- 二维码尺寸测试 ---')

  const text = 'Hello World 你好世界'

  for (const size of [500, 1000, 1500]) {
    const dataUrl = await generateQrCode(text, size)
    assert(dataUrl.startsWith('data:image/png;base64,'), `${size}px: 生成成功`)
  }
}

async function testSpecialChars() {
  console.log('\n--- 特殊字符测试 ---')

  const specialText = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~\t\\'
  const chunks = splitPlainText(specialText)
  assert(chunks.join('') === specialText, '特殊符号: 分片合并一致')

  const newlineText = 'line1\nline2\nline3\n\r\nline4'
  const nlChunks = splitPlainText(newlineText)
  assert(nlChunks.join('') === newlineText, '换行符: 分片合并一致')
}

async function testLargeData() {
  console.log('\n--- 大数据量纯文本测试 ---')

  const sizes = [
    { name: '1000字符', count: 1000 },
    { name: '50KB', count: 50 * 1024 },
    { name: '500KB', count: 500 * 1024 },
    { name: '1MB', count: 1024 * 1024 },
  ]

  const content = '测试Test🎉\n'

  for (const size of sizes) {
    let text = ''
    while (text.length < size.count) text += content
    text = text.substring(0, size.count)

    const chunks = splitPlainText(text)
    const merged = chunks.join('')
    assert(merged === text, `${size.name}: ${chunks.length}个分片, 合并后完全一致`)
  }
}

async function testUserSpecificTexts() {
  console.log('\n--- 用户指定测试文本 ---')

  const text1 = `export ANTHROPIC_AUTH_TOKEN=test
export ANTHROPIC_BASE_URL=https://anyrouter.top
claude`
  const chunks1 = splitPlainText(text1)
  const result1 = chunks1.join('')
  assert(result1 === text1, `export命令文本: chunks.join('') === source (${chunks1.length}片)`)

  const text2 = '你好二维码测试'
  const chunks2 = splitPlainText(text2)
  const result2 = chunks2.join('')
  assert(result2 === text2, `中文短文本: chunks.join('') === source (${chunks2.length}片)`)

  const text3 = '😀😀😀😀'
  const chunks3 = splitPlainText(text3)
  const result3 = chunks3.join('')
  assert(result3 === text3, `Emoji短文本: chunks.join('') === source (${chunks3.length}片)`)
}

async function testNoOverlapNoGap() {
  console.log('\n--- 无重叠无遗漏测试 ---')

  const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(200)
  const chunks = splitPlainText(text)

  let totalLen = 0
  for (let i = 0; i < chunks.length; i++) {
    totalLen += chunks[i].length
    const expectedStart = text.substring(totalLen - chunks[i].length, totalLen)
    assert(chunks[i] === expectedStart, `chunk${i + 1}: 位置正确，无重叠无遗漏`)
    if (i > 2) break
  }

  assert(chunks.join('') === text, `全部${chunks.length}片拼接 === 原文`)
}

async function testUnicodeBoundarySafety() {
  console.log('\n--- Unicode边界安全测试 ---')

  const emoji = '😀🎉🚀💡🔥'
  const longEmoji = emoji.repeat(500)
  const chunks = splitPlainText(longEmoji)

  let allChunksClean = true
  for (const chunk of chunks) {
    if (chunk.includes('\uFFFD')) { allChunksClean = false; break }
    for (const ch of Array.from(chunk)) {
      if (ch.codePointAt(0) <= 0) { allChunksClean = false; break }
    }
  }
  assert(allChunksClean, `全部${chunks.length}个chunk: 无损坏字符，所有codePoint有效`)
  assert(chunks.join('') === longEmoji, `Emoji长文本(${longEmoji.length}字符): 拼接完全一致`)

  const mixedUnicode = '中文a😀b🎉c🚀d'.repeat(300)
  const mixedChunks = splitPlainText(mixedUnicode)
  assert(mixedChunks.join('') === mixedUnicode, `混合Unicode长文本: 拼接完全一致`)
}

async function main() {
  console.log('========================================')
  console.log('  large-qrcode-transfer 纯文本模式测试')
  console.log('========================================')

  await testPlainSplit()
  await testChineseSplit()
  await testEmojiSplit()
  await testMixedSplit()
  await testUserSpecificTexts()
  await testNoOverlapNoGap()
  await testUnicodeBoundarySafety()
  await testQrPlainContent()
  await testQrSizes()
  await testSpecialChars()
  await testLargeData()

  console.log('\n========================================')
  console.log(`  结果: ${passed} 通过, ${failed} 失败`)
  console.log('========================================')

  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('测试执行出错:', err)
  process.exit(1)
})
