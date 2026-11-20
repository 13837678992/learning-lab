import * as pdfjs from 'pdfjs-dist/build/pdf.js'

// webpack 5将Worker打包为同源静态资源，不依赖CDN或运行时包路径字符串。
export async function getPdfPageCount(data, signal) {
  const worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url))
  const pdfWorker = new pdfjs.PDFWorker({ port: worker })
  const task = pdfjs.getDocument({ data, worker: pdfWorker, isEvalSupported: false })
  let abort
  const canceled = new Promise((resolve, reject) => {
    abort = () => {
      const error = new Error('页数读取已取消')
      error.name = 'AbortError'
      reject(error)
    }
    if (signal) {
      if (signal.aborted) abort()
      else signal.addEventListener('abort', abort, { once: true })
    }
  })
  try {
    const document = await Promise.race([task.promise, canceled])
    return document.numPages
  } finally {
    if (signal) signal.removeEventListener('abort', abort)
    try { await task.destroy() }
    finally { pdfWorker.destroy(); worker.terminate() }
  }
}
