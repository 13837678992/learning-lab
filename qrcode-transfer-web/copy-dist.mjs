import { copyFile } from 'node:fs/promises'

const target = '大容量二维码文本传输工具.html'
await copyFile('dist/index.html', target)
console.log(`已生成单文件版本: ${target}`)
