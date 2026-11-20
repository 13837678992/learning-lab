module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset'
  ],
  // Vue CLI现有class-properties转换需要配套处理PDF.js的私有方法。
  // 限定到新增依赖，不改变其他业务代码的编译规则。
  overrides: [{
    test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
    plugins: [['@babel/plugin-transform-private-methods', { loose: false }]]
  }]
}
