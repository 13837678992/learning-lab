const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // 简化HTML文件的创建，以服务您的webpack捆绑包
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin'); //   区分大小写的插件
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');// 将 CSS 提取到单独的文件中。它为每个包含 CSS 的 JS 文件创建一个 CSS 文件
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin'); // Webpack插件，用于优化\最小化CSS资产
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin'); // 在单独的进程上运行类型脚本类型检查器和linter。
const TerserPlugin = require('terser-webpack-plugin'); // 此插件使用terser来最小化/最小化您的JavaScript。
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const os = require('os');


const { name, version } = require('./package.json');

const matchSVGSprite = /assets\/icons\/|components\/Base\/Icon\/icons\//;

const es6modules = ['query-string', 'split-on-first', 'strict-uri-encode', 'array-move',  'debug', 'dom-serializer', 'pinyin'];

const createCssLoaders = (isLess, isDev) => { // true isDec true
    const styleLoader = isDev ? 'style-loader' : MiniCssExtractPlugin.loader;
    console.log(isDev,'isDev')
    if (isLess) {
        return [
            styleLoader,
            {
                loader: 'css-loader',
                options: {
                    modules: true,
                    localIdentName: '[local]',
                },
            },
            'postcss-loader',
            {
                loader: 'less-loader',
                options: {
                    javascriptEnabled: true,
                },
            },
            {
                loader: 'style-resources-loader',
                options: {
                    // less 全局变量
                    patterns: path.resolve(__dirname, './src/assets/less/index.less'),
                    injector: 'append',
                },
            },
        ];
    } else {
        return [styleLoader, 'css-loader'];
    }
};

module.exports = (env, argv) => {
    const isDev = argv.mode === 'development';
    let publicPath = '/';
    if (isDev) {
        publicPath = '/';
    }
    return {
        entry: {
            index: [path.resolve(__dirname, 'src/index.js')],
        },
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].js',
            chunkFilename: '[name].bundle.js',
            publicPath,
        },
        cache: {
            type: 'filesystem',
        },
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    use: [
                        {
                            loader: 'thread-loader',
                            options: {
                                worker: os.cpus().length - 1,
                            },
                        },
                        {
                            loader: 'babel-loader',
                            options: {
                                sourceType: 'unambiguous',
                                presets: [
                                    '@babel/preset-react',
                                    isDev
                                        ? null
                                        : [
                                            '@babel/preset-env',
                                            {
                                                modules: false,
                                            },
                                        ],
                                ].filter(Boolean),
                                plugins: [
                                    '@babel/plugin-syntax-dynamic-import',
                                    ['@babel/plugin-proposal-decorators', { legacy: true }],
                                    '@babel/plugin-proposal-class-properties',
                                    [
                                        '@babel/plugin-transform-runtime',
                                        {
                                            useESModules: true,
                                        },
                                    ],
                                    '@babel/plugin-proposal-optional-chaining',
                                ],
                                cacheDirectory: true,
                                cacheCompression: false,
                            },
                        },
                    ].filter(Boolean),
                    exclude: [new RegExp(`node_modules/(?!(${es6modules.join('|')})/).*`)],
                },
                {
                    test: /\.tsx?/,
                    use: [
                        {
                            loader: 'thread-loader',
                            options: {
                                worker: os.cpus().length - 1,
                            },
                        },
                        {
                            loader: 'ts-loader',
                            options: {
                                happyPackMode: true,
                                transpileOnly: true,
                                compilerOptions: {
                                    noEmit: false,
                                    module: 'esnext',
                                    target: isDev ? 'es2017' : 'es5',
                                },
                            },
                        },
                    ].filter(Boolean),
                },
                {
                    test: /\.(mp4|png|jpg|jpeg|png|svg|cur|gif|webp)$/,
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                limit: 8192,
                                name: 'static/[name].[hash].[ext]',
                            },
                        },
                    ],
                    exclude: matchSVGSprite,
                },
                {
                    test: /\.svg$/,
                    include: matchSVGSprite,
                    use: [
                        {
                            loader: 'svg-sprite-loader',
                            options: {
                                symbolId: 'icon-[name]',
                            },
                        },
                    ],
                },
                {
                    test: /\.less$/,
                    use: createCssLoaders(true, isDev),
                },
                {
                    test: /\.css$/,
                    use: createCssLoaders(false, isDev),
                },
            ],
        },

        optimization: {
            splitChunks: {
                cacheGroups: {
                    styles: {
                        name: 'styles',
                        test: /\.(css|less)$/,
                        chunks: 'all',
                        enforce: true,
                    },
                },
            },
            minimize: !isDev,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            pure_funcs: ['console.log'],
                        },
                    },
                }),
            ],
        },

        plugins: [
            new ForkTsCheckerWebpackPlugin({
                typescript: {
                    diagnosticOptions: {
                        semantic: true,
                        syntactic: true,
                    },
                async: false,
            }}),
            new CaseSensitivePathsPlugin(),
            new SpriteLoaderPlugin(),
            ...(isDev
                ? [
                    new ESLintPlugin()
                ]
                : [
                    new MiniCssExtractPlugin({
                        // filename: '[name].css',
                        // chunkFilename: '[id].css',
                    }),
                    new OptimizeCSSAssetsPlugin(),
                ]),
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || argv.mode),
                'process.env.TYPE': JSON.stringify(process.env.type || argv.type),
            }),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                template: path.resolve(__dirname, './src/index.html'),
                publicPath,
            }),

        ],

        externals: {},

        resolve: {
            symlinks: false,
            extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
            alias: {
                '@components': path.resolve(__dirname, 'src/components/'),
                '@services': path.resolve(__dirname, 'src/services/'),
                '@utils': path.resolve(__dirname, 'src/utils/'),
                '@actions': path.resolve(__dirname, 'src/actions/'),
                '@reducers': path.resolve(__dirname, 'src/reducers/'),
                '@hooks': path.resolve(__dirname, 'src/hooks/'),
                '@routers': path.resolve(__dirname, 'src/routers/'),
                '@view': path.resolve(__dirname, 'src/view/'),

            },
        },

        devServer: {
            static: {
                directory: path.join(__dirname, 'public'),
            },
            compress: true,
            port: 8031,
            historyApiFallback: {
                rewrites: [
                    { from: /^\/$/, to: '/src/landing.html' },
                ],
            },
            host: '0.0.0.0',
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            proxy: {
              '/api': {
                target: 'http://localhost:8030',
                changeOrigin: true,
                  pathRewrite: { '^/api': '' },
              },
            },
            client: {
                overlay: false,
                progress: true,
            },
        },

        devtool: isDev ? 'inline-source-map' : 'nosources-source-map',

        stats: {
            children: false,
            warningsFilter: (warning) => /(Conflicting order between)|(export .* was not found in)/gm.test(warning),
        },
    };
};


