import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'

  ;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  debugger
  // 1. 登录
  await page.goto('http://localhost:8080')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', '7Im6tiMKYhYSWq0Y')
  await page.click('input[type="submit"]')
  await page.waitForTimeout(2000)

  // 要上传的本地目录
  const rootDir = 'C:/Users/weicheng/Downloads/data/test_upload_files'

  // 递归函数
  async function uploadDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true })

    for (const file of files) {
      const fullPath = path.join(dir, file.name)

      if (file.isDirectory()) {
        // 创建目录
        await page.click('button[title="New folder"]')
        await page.fill('input#focus-prompt', file.name)
        await page.click('button[title="Create"]')
        await page.waitForTimeout(1000)

        // 进入目录
        await page.click(`a:has-text("${file.name}")`)
        await page.waitForTimeout(500)

        // 递归上传子目录
        await uploadDir(fullPath)

        // 返回上一级 —— 使用备份的 file.name 定位导航栏路径
        await goUpOneLevel(page)
        // 如果 FileBrowser 的 ".." 是固定按钮，也可以直接用：
        // await page.click('a[title="Go up one folder"]')
        await page.waitForTimeout(500)
      }

    }
    // 上传文件
    // await page.click('button[title="Upload"]')
    const filePaths = files
        .filter(f => f.isFile())
        .map(f => path.join(dir, f.name))

    if (filePaths.length > 0) {
      await page.click('button[title="Upload"]')
      const input = await page.$('input[type="file"]')
      await input.setInputFiles(filePaths) // 一次性上传多个
      await page.waitForTimeout(2000)
    }
    // const input = await page.$('input[type="file"]')
    // await input.setInputFiles(fullPath)
    // await page.waitForTimeout(2000)
  }
  // 返回上一级目录
  async function goUpOneLevel(page) {
    // 找到所有 breadcrumbs 链接
    const links = await page.$$('.breadcrumbs a')
    const count = links.length

    if (count > 1) {
      // 倒数第二个就是“上一级目录”
      await links[count - 2].click()
      await page.waitForTimeout(500)
    } else {
      console.log('已经在根目录了，不能再返回上一级')
    }
  }


  await uploadDir(rootDir)

  console.log('上传完成 ✅')
  // await browser.close();
})()
