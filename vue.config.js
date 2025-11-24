const { defineConfig } = require('@vue/cli-service')
const path = require('node:path')
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'components': path.resolve(__dirname, 'src/components'),
        'assets': path.resolve(__dirname, 'src/assets')
      }
    }
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://169.254.83.107:3000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      }
    }
  }
})
