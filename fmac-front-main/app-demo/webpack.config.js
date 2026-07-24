/**
 * 子应用 app-demo webpack 4 构建配置（qiankun UMD 输出）。
 *
 * 关键点（见 CLAUDE.md 第五/六节、TASK Phase 3）：
 * - CommonJS 配置；业务源码 ESM 由 babel 转译。
 * - UMD：library=应用名、libraryTarget=umd、globalObject=window、jsonpFunction 唯一化，
 *   使 qiankun 能从 window[应用名] 读取生命周期。
 * - devServer 开启 CORS（Access-Control-Allow-Origin: *），供基座跨源拉取子应用资源。
 * - 运行期 publicPath 修正见 src/public-path.js。
 * - 应用名 app-demo 须与主应用注册的 name / activeRule 对应。
 */
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const QIANKUN_NAME = 'app-demo';
const PORT = 7201;

// 依赖无关的 .env 读取（不引入 dotenv）。按 APP_MODE 选择文件；process.env 优先级更高（部署期覆盖）。
const ENV_FILE = { development: '.env.dev', test: '.env.test', production: '.env.prod' };
function loadEnv(appMode) {
  const file = path.resolve(__dirname, ENV_FILE[appMode] || '.env.dev');
  const out = {};
  if (fs.existsSync(file)) {
    fs.readFileSync(file, 'utf-8')
      .split('\n')
      .forEach((raw) => {
        const line = raw.trim();
        if (!line || line.startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx === -1) return;
        out[line.slice(0, idx).trim()] = line
          .slice(idx + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
      });
  }
  return out;
}

module.exports = (_env, argv) => {
  const mode = argv && argv.mode === 'production' ? 'production' : 'development';
  const isProd = mode === 'production';
  const appMode = process.env.APP_MODE || (isProd ? 'production' : 'development');

  const fileEnv = loadEnv(appMode);
  const pick = (key, fallback) =>
    process.env[key] !== undefined ? process.env[key] : fileEnv[key] !== undefined ? fileEnv[key] : fallback;

  const API_BASE = pick('API_BASE', '/api');
  const PUBLIC_PATH = pick('PUBLIC_PATH', isProd ? '/app-demo/' : `//localhost:${PORT}/`);

  const distPath = path.resolve(__dirname, 'dist');
  if (isProd) fs.rmSync(distPath, { recursive: true, force: true });

  return {
    mode,
    entry: path.resolve(__dirname, 'src/main.js'),
    output: {
      path: distPath,
      filename: isProd ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      chunkFilename: isProd ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      // 独立运行 / 部署路径；qiankun 运行期由 public-path.js 覆盖。
      publicPath: PUBLIC_PATH,
      library: QIANKUN_NAME,
      libraryTarget: 'umd',
      globalObject: 'window',
      jsonpFunction: `webpackJsonp_${QIANKUN_NAME}`,
    },
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    module: {
      rules: [
        { test: /\.vue$/, loader: 'vue-loader' },
        { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
        { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
          use: [{ loader: 'file-loader', options: { name: 'assets/[name].[hash:8].[ext]' } }],
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        title: 'FMAC 子应用 · app-demo',
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.APP_MODE': JSON.stringify(appMode),
        'process.env.API_BASE': JSON.stringify(API_BASE),
        'process.env.PUBLIC_PATH': JSON.stringify(PUBLIC_PATH),
      }),
    ],
    devServer: {
      port: PORT,
      historyApiFallback: true,
      hot: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
      before: require('./mock'),
    },
    devtool: isProd ? false : 'source-map',
  };
};
