// 只统计文件结构中的真实页数，不提炼报告观点，也不推断观点对应页码。
const pageCountCache = new WeakMap()

function checkCanceled(signal) {
  if (signal && signal.aborted) {
    const error = new Error('页数读取已取消')
    error.name = 'AbortError'
    throw error
  }
}

export async function getReportFilePageCount(file, { signal } = {}) {
  checkCanceled(signal)
  if (pageCountCache.has(file)) return pageCountCache.get(file)
  const extension = file.name.split('.').pop().toLowerCase()
  try {
    const data = await file.arrayBuffer()
    checkCanceled(signal)
    let count
    if (extension === 'pdf') {
      if (typeof Worker !== 'undefined') {
        const { getPdfPageCount } = await import('./monthlyReportPdfPages')
        checkCanceled(signal)
        count = await getPdfPageCount(data, signal)
      } else {
        // Node回归测试使用PDF.js自身的Worker兼容实现；浏览器使用本地独立Worker。
        const library = await import('pdfjs-dist/build/pdf.js')
        const pdfjs = library.default || library
        const task = pdfjs.getDocument({ data, isEvalSupported: false })
        try { count = (await task.promise).numPages }
        finally { await task.destroy() }
      }
    } else if (extension === 'pptx') {
      const library = await import('jszip')
      const JSZip = library.default || library
      checkCanceled(signal)
      const zip = await JSZip.loadAsync(data)
      count = Object.keys(zip.files).filter(path =>
        !zip.files[path].dir && /^ppt\/slides\/slide[1-9]\d*\.xml$/.test(path)
      ).length
    } else {
      throw new Error('不支持的文件格式')
    }
    checkCanceled(signal)
    if (!Number.isInteger(count) || count < 1) throw new Error('文件没有有效页面')
    pageCountCache.set(file, count)
    return count
  } catch (error) {
    checkCanceled(signal)
    if (error.name === 'AbortError') throw error
    const message = error.name === 'PasswordException'
      ? 'PDF文件已加密，请先解除密码保护后重新选择'
      : `无法读取${extension === 'pptx' ? 'PPTX幻灯片数量' : 'PDF页数'}，文件可能已损坏或格式不正确，请重新选择`
    const failure = new Error(message)
    failure.code = '40002'
    throw failure
  }
}
