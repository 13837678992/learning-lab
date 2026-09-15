import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HTML_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '大容量二维码文本传输工具.html'
)

const executablePath =
  process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined

let failed = 0
function check(name, cond) {
  if (cond) {
    console.log(`  PASS ${name}`)
  } else {
    failed++
    console.error(`  FAIL ${name}`)
  }
}

const browser = await chromium.launch({ headless: true, executablePath })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

await page.goto('file://' + HTML_FILE)
await page.waitForLoadState('load')

check('标题渲染', (await page.locator('h1').textContent()).includes('大容量二维码'))
check('初始占位符可见', await page.locator('#placeholder').isVisible())
check('初始控制面板隐藏', await page.locator('#control-panel').isHidden())

// 生成多张二维码（约 9000 字符，每张 ≤1200 字节，必然分片）
const longText = '中文测试内容ABC123😀\n'.repeat(600)
await page.fill('#text-input', longText)
check('字符统计更新', (await page.locator('#char-count').textContent()) === String(longText.length))
await page.click('#btn-generate')
await page.waitForSelector('#qr-display:not([hidden])', { timeout: 60000 })
const imgSrc = await page.getAttribute('#qr-image', 'src')
check('二维码图片生成', imgSrc.startsWith('data:image/png'))
const total = Number(await page.locator('#chunk-total').textContent())
check('长文本自动分片（数量>1）', total > 1)
const expected = Math.ceil(new Blob([longText]).size / 1200)
check(`分片数量符合预期（${total} ≈ ${expected}）`, total === expected)

// 上下张与键盘方向键
await page.click('#btn-next')
check('下一张按钮', (await page.locator('#qr-index').textContent()) === '2')
await page.keyboard.press('ArrowRight')
check('键盘 → 下一张', (await page.locator('#qr-index').textContent()) === '3')
await page.keyboard.press('ArrowLeft')
check('键盘 ← 上一张', (await page.locator('#qr-index').textContent()) === '2')

// 边界不越界
await page.click('#btn-prev')
check('上一张到达首张', (await page.locator('#qr-index').textContent()) === '1')
check('首张时上一张按钮禁用', await page.locator('#btn-prev').isDisabled())
await page.keyboard.press('ArrowLeft')
check('键盘 ← 首张不越界', (await page.locator('#qr-index').textContent()) === '1')

// 自动播放
const beforePlay = Number(await page.locator('#qr-index').textContent())
await page.click('#btn-play')
await page.waitForTimeout(1300)
const duringPlay = Number(await page.locator('#qr-index').textContent())
check('自动播放推进', duringPlay !== beforePlay)
await page.click('#btn-play')

// 剪贴板（file:// 下预期被限制，走降级提示，不抛错）
await page.click('#btn-clipboard')
await page.waitForTimeout(300)
const status = await page.locator('#status-line').textContent()
check('剪贴板读取有反馈', status.length > 0)

// 导出 PNG
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
  page.click('#btn-export'),
])
check('导出当前二维码 PNG', !!download && download.suggestedFilename().endsWith('.png'))

// 清空重置
await page.click('#btn-clear')
check('清空后回到占位符', await page.locator('#placeholder').isVisible())
check('清空后控制面板隐藏', await page.locator('#control-panel').isHidden())

check('页面无 JS 报错', pageErrors.length === 0)
if (pageErrors.length) console.error(pageErrors)

await browser.close()
process.exit(failed ? 1 : 0)
