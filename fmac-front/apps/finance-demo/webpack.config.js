/**
 * 财务管理系统子应用 —— webpack 4 构建（qiankun 子应用 UMD 输出）。
 * 与 Vite 子应用（user/order/report）并存，验证平台「构建工具无关」：packages 无需改动。
 *
 * 说明：
 * - webpack 4 不支持 ESM 配置，故本文件用 CommonJS；业务源码仍保持 ESM（babel 转译）。
 * - qiankun：UMD + library=应用名 + globalObject=window，运行期 publicPath 见 src/public-path.js。
 * - @fmac/* 经 pnpm 符号链接解析到 packages/、configs/ 真实路径（非 node_modules），故会被 babel 转译。
 * - qiankun 应用名须与 @fmac/constants 的 MICRO_APPS.FINANCE 一致。
 */
const path = require('path');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const QIANKUN_NAME = 'app-finance-demo';
const PORT = 7104;

module.exports = (_env, argv) => {
  const mode = argv && argv.mode === 'production' ? 'production' : 'development';
  const isProd = mode === 'production';
  const appMode = process.env.APP_MODE || (isProd ? 'production' : 'development');

  return {
    mode,
    entry: path.resolve(__dirname, 'src/main.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      publicPath: process.env.VITE_BASE || '/',
      library: QIANKUN_NAME,
      libraryTarget: 'umd',
      globalObject: 'window',
      jsonpFunction: `webpackJsonp_${QIANKUN_NAME}`,
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
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.APP_MODE': JSON.stringify(appMode),
      }),
    ],
    devServer: {
      port: PORT,
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: true,
      hot: true,
    },
    devtool: isProd ? false : 'source-map',
  };
};
