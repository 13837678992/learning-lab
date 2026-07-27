const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');
const setupMock = require('./mock/index.js');

module.exports = (env) => {
  const envFile = env && env.prod
    ? '.env.prod'
    : env && env.test
      ? '.env.test'
      : '.env.dev';

  const envPath = path.resolve(__dirname, envFile);
  const envVars = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          envVars['process.env.' + key] = JSON.stringify(value);
        }
      }
    });
  }

  return {
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].[contenthash:8].js',
      publicPath: '/',
      library: 'app-demo',
      libraryTarget: 'umd'
    },
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm.js',
        '@': path.resolve(__dirname, 'src')
      },
      extensions: ['.js', '.vue', '.json']
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          include: path.resolve(__dirname, 'src'),
          options: {
            configFile: path.resolve(__dirname, 'babel.config.js')
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: 'img/[name].[hash:8].[ext]'
          }
        },
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: 'fonts/[name].[hash:8].[ext]'
          }
        }
      ]
    },
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        filename: 'index.html'
      }),
      new webpack.DefinePlugin(envVars)
    ],
    devServer: {
      port: 9001,
      hot: true,
      open: false,
      historyApiFallback: true,
      overlay: true,
      compress: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      before: function(app) {
        app.use(require('express').json());
        setupMock(app);
      }
    },
    devtool: 'source-map'
  };
};
