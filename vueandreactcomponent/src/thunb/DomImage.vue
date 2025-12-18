<template>
  <div class="app">
    <!-- 左侧缩略图 -->
    <div class="sidebar">
      <div
        v-for="(thumb, index) in thumbnails"
        :key="index"
        class="thumbnail"
        :class="{ active: currentPage === index }"
        @click="scrollToPage(index)"
      >
        <img v-if="thumb" :src="thumb" />
        <div v-else class="thumb-loading">生成中</div>
        <div class="thumb-index">P{{ index + 1 }}</div>
      </div>
    </div>

    <!-- 右侧正文 -->
    <div class="content" ref="content">
      <div v-for="page in pages" :key="page" class="page" :ref="'page-' + (page - 1)">
        <h2>第 {{ page }} 页</h2>
        <p v-for="i in 30" :key="i">这是第 {{ page }} 页的正文内容，用于模拟真实文档布局。</p>
      </div>
    </div>
  </div>
</template>

<script>
import domtoimage from 'dom-to-image'
import init, * as wasm from '@/wasm/wasm_thumb/wasm_thumb.js'

await init()

const { slice_and_resize, resize_png } = wasm

export default {
  name: 'App',
  data() {
    return {
      pages: Array.from({ length: 40 }, (_, i) => i + 1),
      thumbnails: Array(40).fill(null),
      currentPage: 0,
    }
  },
  async mounted() {
    await init()

    // 二选一
    await this.generateAllThumbnails()
    // await this.generateThumbnailsWithWasmResize()

    // await this.generateThumbnailsByOneShot()

    this.bindScroll()
  },

  methods: {
    async generateThumbnailsByOneShot() {
      console.time('one-shot + wasm')

      // 1️⃣ DOM → Blob（官方 API）
      const blob = await domtoimage.toBlob(this.$refs.content)

      // 2️⃣ Blob → ImageBitmap（高效解码）
      const bitmap = await createImageBitmap(blob)

      // 3️⃣ ImageBitmap → Canvas
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0)

      // 4️⃣ Canvas → ImageData
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // 5️⃣ wasm 裁剪 + resize
      const pageHeight = this.$refs['page-0'][0].offsetHeight + 30
      const pageWidth = canvas.width

      const thumbs = slice_and_resize(
        imageData.data,
        pageWidth,
        pageHeight,
        this.pages.length,
        300,
        400
      )

      // 6️⃣ ImageData → 缩略图
      thumbs.forEach((rgba, i) => {
        const c = document.createElement('canvas')
        c.width = 300
        c.height = 400
        c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), 300, 400), 0, 0)
        c.toBlob(blob => {
          this.$set(this.thumbnails, i, URL.createObjectURL(blob))
        })
      })

      console.timeEnd('one-shot + wasm')
    },
    async generateAllThumbnails() {
      console.time('dom-to-image total')

      for (let i = 0; i < this.pages.length; i++) {
        const el = this.$refs['page-' + i][0]

        try {
          const dataUrl = await domtoimage.toPng(el, {
            width: el.offsetWidth,
            height: el.offsetHeight,
            style: {
              transform: 'scale(0.25)',
              transformOrigin: 'top left',
            },
          })
          this.$set(this.thumbnails, i, dataUrl)
        } catch (e) {
          console.error('缩略图生成失败:', i, e)
        }
      }

      console.timeEnd('dom-to-image total')
    },
    // async generateThumbnailsByRust() {
    //   console.time('rust-wasm total')

    //   const csvMock = Array(100).fill('a,b,c,d').join('\n')

    //   for (let i = 0; i < 40; i++) {
    //     const img = csv_to_thumbnail(csvMock)
    //     this.$set(this.thumbnails, i, img)
    //   }

    //   console.timeEnd('rust-wasm total')
    // },
    async generateThumbnailsWithWasmResize() {
      console.time('dom + wasm-resize total')

      for (let i = 0; i < this.pages.length; i++) {
        const el = this.$refs['page-' + i][0]

        // 1. 先用 dom-to-image 把页面变成 PNG dataURL（内容和原来完全一样）
        const dataUrl = await domtoimage.toPng(el, {
          width: el.offsetWidth,
          height: el.offsetHeight,
        })

        // 2. dataURL -> Uint8Array（PNG 原始字节）
        const pngBytes = await this.dataUrlToUint8Array(dataUrl)

        // 3. 调用 wasm 里的 resize_png 做缩放（例如缩到 300x400）
        const resizedBytes = resize_png(pngBytes, 300, 400)

        // 4. 把 Uint8Array 包成 Blob，再生成可用的 URL
        const blob = new Blob([resizedBytes], { type: 'image/png' })
        const thumbUrl = URL.createObjectURL(blob)

        this.$set(this.thumbnails, i, thumbUrl)
      }

      console.timeEnd('dom + wasm-resize total')
    },

    async dataUrlToUint8Array(dataUrl) {
      // 用 fetch 对 dataURL 发请求，拿到 ArrayBuffer
      const res = await fetch(dataUrl)
      const buffer = await res.arrayBuffer()
      return new Uint8Array(buffer)
    },
    scrollToPage(index) {
      const el = this.$refs['page-' + index][0]
      el.scrollIntoView({ behavior: 'smooth' })
      this.currentPage = index
    },

    bindScroll() {
      const container = this.$refs.content
      container.addEventListener('scroll', () => {
        const pages = this.pages.map((_, i) => {
          const el = this.$refs['page-' + i][0]
          return Math.abs(el.getBoundingClientRect().top - 80)
        })
        this.currentPage = pages.indexOf(Math.min(...pages))
      })
    },
  },
}
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左侧 */
.sidebar {
  width: 180px;
  overflow-y: auto;
  border-right: 1px solid #ddd;
  background: #f7f7f7;
}

.thumbnail {
  position: relative;
  padding: 6px;
  cursor: pointer;
}

.thumbnail img {
  width: 100%;
  border: 1px solid #ccc;
}

.thumbnail.active {
  background: #dbeafe;
}

.thumb-loading {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #999;
}

.thumb-index {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 10px;
  color: #555;
}

/* 右侧正文 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #eee;
}

.page {
  width: 800px;
  min-height: 1000px;
  margin: 0 auto 30px;
  background: #fff;
  padding: 40px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);
}
</style>
