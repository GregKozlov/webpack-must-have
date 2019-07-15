const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const PreloadPlugin = require('preload-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CleanPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const path = require('path');
const srcPath = path.resolve(__dirname, "./src/");
const destPath = path.resolve(__dirname, "./build/"); //('../Api/wwwroot')
const assetsPath = path.resolve(__dirname, "./public/");

module.exports = function (_env, argv) {
    const isDevServer = argv['$0'].indexOf('webpack-dev-server') !== -1;
    const mode = argv.mode || isDevServer ? 'development': 'production';
    const isDevMode = mode !== 'production';

    let result = {
        stats: {
            children: false //disable console.info for node_modules/*
        },
        entry: path.resolve(__dirname, srcPath, 'main.jsx'), //entyPoint for webpack
        output: {
            path: destPath,
            filename: "[name].js",
            chunkFilename: "[name].js",
            publicPath: "/",
        },
        optimization: {
            splitChunks: {
                minChunks: 1,
                cacheGroups: {
                    vendors: {
                        name: 'chunk-vendors', //move js-files from node_modules into splitted file [chunk-vendors].js
                        test: /[\\\/]node_modules[\\\/]/,
                        priority: -10,
                        chunks: 'initial'
                    },
                    common: {
                        name: 'chunk-common', //move reusable nested js-files into splitted file [chunk-common].js
                        minChunks: 2,
                        priority: -20,
                        chunks: 'initial',
                        reuseExistingChunk: true
                    }
                }
            }
        },
        module: {
            rules: [{
                    test: /\.(js|jsx)$/, //rules for js, jsx files
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader" //transpile *.js, **.jsx to result according to .browserlistsrc file
                    }
                },
                {
                    //TODO: add sourceMap: true for every loader for prod.build
                    test: /\.css$|\.scss$/, //rules for style-files
                    oneOf: [
                        /* config .oneOf('normal-modules') - rule for [name].module.css files - rule for css-modules*/
                        {
                            test: /\.module\.\w+$/,
                            use: [
                                isDevServer ?
                                'style-loader' : //it extracts style dircetly into html (MiniCssExtractPlugin works incorrect with hmr and modules architecture)
                                MiniCssExtractPlugin.loader, //it extracts styles into file *.css
                                {
                                    loader: 'css-loader', //it interprets @import and url() like import/require() and it resolves them (you can use [import *.css] into *.js).
                                    options: {
                                        modules: {
                                            getLocalIdent: (loaderContext, _localIdentName, localName, options) => { //TODO: minify classNames for prod-build
                                                const request = path.relative(options.context || "", loaderContext.resourcePath)
                                                     .replace(/\\/g, '_')
                                                     .replace(/\./g, '-');
                                                return `${request}__${localName}`;
                                            }
                                        },
                                    }
                                },
                                {
                                    loader: "sass-loader", //it compiles Sass to CSS, using Node Sass by default
                                    options: {
                                        data: '@import "variables";',
                                        includePaths: [path.resolve(__dirname, "src/styles")],
                                    }
                                },
                                'postcss-loader' //it provides adding vendor prefixes to CSS rules using values from Can I Use (see postcss.config.js in the project)

                            ]
                        },
                        /* config .oneOf('normal') */
                        {
                            use: [{
                                    loader: MiniCssExtractPlugin.loader, //it extracts styles into file *.css
                                    options: {
                                        hmr: isDevServer, //Hot Module Replacement - hot update of the page by changing css
                                        //reloadAll: true //uncomment if hmr works incorectly
                                    },
                                },
                                'css-loader', //it interprets @import and url() like import/require() and it resolves them (you can use [import *.css] into *.js).
                                {
                                    loader: "sass-loader", //it compiles Sass to CSS, using Node Sass by default
                                    options: {
                                        data: '@import "variables";',
                                        includePaths: [path.resolve(__dirname, "src/style")],
                                    }
                                },
                                'postcss-loader' //it provides adding vendor prefixes to CSS rules using values from Can I Use (see postcss.config.js in the project)
                            ]
                        }
                    ]
                }
            ]
        },
        plugins: [
            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/), //it adds force-ignoring unused parts of modules like moment/locale/*.js
            new webpack.DefinePlugin({ //it adds custom Global definition to the project like BASE_URL for index.html
                "process.env": {
                    NODE_ENV: JSON.stringify(mode),
                    BASE_URL: '"/"'
                }
            }),
            new CaseSensitivePathsPlugin(), //it fixes bugs between OS in caseSensitivePaths (since Windows isn't CaseSensitive but Linux is)
            new FriendlyErrorsWebpackPlugin(), //it provides user-friendly errors from webpack (since the last has ugly useless bug-report)
            new HtmlWebpackPlugin({ //it creates *.html with injecting js and css into template
                template: path.resolve(assetsPath, "index.html"),
                minify: isDevMode ? false : {
                    removeComments: true,
                    collapseWhitespace: true,
                    removeAttributeQuotes: true,
                    collapseBooleanAttributes: true,
                    removeScriptTypeAttributes: true
                }
            }),
            new PreloadPlugin({ //it adds 'preload' tag for async js-files: https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content
                rel: "preload",
                include: "initial",
                fileBlacklist: [/\.map$/, /hot-update\.js$/]
            }),
            new PreloadPlugin({ //it adds 'prefetch' tag for async js-files: https://developer.mozilla.org/en-US/docs/Web/HTTP/Link_prefetching_FAQ
                rel: "prefetch",
                include: "asyncChunks"
            }),
            new MiniCssExtractPlugin({
                filename: isDevMode ? '[name].css' : '[name].[contenthash].css',
                chunkFilename: isDevMode ? '[id].css' : '[id].[contenthash].css',
            }),
            new CleanPlugin.CleanWebpackPlugin(),
            new CopyWebpackPlugin([{ //it copies files like images, fonts etc. from 'public' path 'destPath' (since not every file will be injected into css and js)
                from: assetsPath,
                to: destPath,
                toType: "dir",
                ignore: [".DS_Store"]
            }])
        ]
    };

    return result;
};