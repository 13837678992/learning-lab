/**
 * 主应用（qiankun 基座）webpack 4 构建配置。
 *
 * 说明（见 CLAUDE.md）：
 * - 第六节：Node 配置文件使用 CommonJS（module.exports）。
 * - 基座为普通 SPA（非 UMD）；qiankun 的 registerMicroApps/start 在业务源码中直接调用。
 * - webpack4 在 OpenSSL3 / 新版 Node 下需 NODE_OPTIONS=--openssl-legacy-provider（见 package.json 脚本）。
 * - Vite 的 import.meta.env 在 webpack 下以 process.env + DefinePlugin 注入替代。
 */
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const PORT = 7200;

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
        const key = line.slice(0, idx).trim();
        out[key] = line
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
  const PUBLIC_PATH = pick('PUBLIC_PATH', '/');
  const SUBAPP_DEMO_ENTRY = pick('SUBAPP_DEMO_ENTRY', isProd ? '/app-demo/' : '//localhost:7201');

  const distPath = path.resolve(__dirname, 'dist');
  // webpack4 无 output.clean；生产构建前清理 dist，避免旧 hash 产物堆积。
  if (isProd) fs.rmSync(distPath, { recursive: true, force: true });

  return {
    mode,
    entry: path.resolve(__dirname, 'src/main.js'),
    output: {
      path: distPath,
      filename: isProd ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      chunkFilename: isProd ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      publicPath: PUBLIC_PATH,
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
        title: 'FMAC 主应用',
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.APP_MODE': JSON.stringify(appMode),
        'process.env.API_BASE': JSON.stringify(API_BASE),
        'process.env.PUBLIC_PATH': JSON.stringify(PUBLIC_PATH),
        // 子应用注册地址；.env 文件或部署期环境变量可覆盖。
        'process.env.SUBAPP_DEMO_ENTRY': JSON.stringify(SUBAPP_DEMO_ENTRY),
      }),
    ],
    devServer: {
      port: PORT,
      historyApiFallback: true,
      hot: true,
      // 开发态 Mock 后端（/api/*）：登录 / 菜单 / 用户信息，使基座可独立联调。
      before: require('./mock'),
    },
    devtool: isProd ? false : 'source-map',
  };
};
