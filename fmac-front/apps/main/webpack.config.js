/**
 * 主应用（qiankun 基座）—— webpack 4 构建。
 * 基座为普通 SPA（非 UMD/子应用）；qiankun 注册/启动经 @fmac/core。
 *
 * 说明：
 * - webpack 4 不支持 ESM 配置，故本文件用 CommonJS；业务源码仍保持 ESM（babel 转译）。
 * - Vite 专有的 import.meta.env 在 webpack 下改用 process.env + DefinePlugin 注入。
 * - @fmac/* 经 pnpm 符号链接解析到 packages/、configs/ 真实路径（非 node_modules），故会被 babel 转译。
 */
const path = require('path');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const PORT = 7100;
// 子应用 entry 覆盖变量（部署期注入）；缺省时由 @fmac/env 按 APP_MODE 解析。
const SUB_ENV_KEYS = [
  'VITE_API_BASE',
  'VITE_SUB_USER',
  'VITE_SUB_ORDER',
  'VITE_SUB_REPORT',
  'VITE_SUB_FINANCE',
];

module.exports = (_env, argv) => {
  const mode = argv && argv.mode === 'production' ? 'production' : 'development';
  const isProd = mode === 'production';
  const appMode = process.env.APP_MODE || (isProd ? 'production' : 'development');

  const define = {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.APP_MODE': JSON.stringify(appMode),
  };
  SUB_ENV_KEYS.forEach((k) => {
    define[`process.env.${k}`] = JSON.stringify(process.env[k] || '');
  });

  return {
    mode,
    entry: path.resolve(__dirname, 'src/main.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      publicPath: process.env.VITE_BASE || '/',
    },
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: { '@': path.resolve(__dirname, 'src') },
      symlinks: true,
    },
    module: {
      rules: [
        { test: /\.vue$/, loader: 'vue-loader' },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: { presets: [['@babel/preset-env', { targets: { node: '18.19' } }]] },
          },
        },
        { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
          use: [{ loader: 'file-loader', options: { name: 'assets/[name].[hash:8].[ext]' } }],
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'public/index.html') }),
      new webpack.DefinePlugin(define),
    ],
    devServer: {
      port: PORT,
      historyApiFallback: true,
      hot: true,
    },
    devtool: isProd ? false : 'source-map',
  };
};
