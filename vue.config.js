const MergeJsonWebpackPlugin = require( "merge-jsons-webpack-plugin" );
const CopyWebpackPlugin = require( "copy-webpack-plugin" );
const path = require( "path" );

const dirSrc    = `./src`;
const dirAssets = `${dirSrc}/assets`;
const dest      = `${__dirname}/dist`;

module.exports = {
    publicPath: "./",
    filenameHashing: true,
    productionSourceMap: false,
    configureWebpack: {
        plugins: [

            new CopyWebpackPlugin({
                patterns: [
                    { from: `${dirAssets}/images/favicon`,  to: path.resolve( dest, "assets", "favicon" ) },
                    { from: `${dirAssets}/images/logo.png`, to: path.resolve( dest, "assets" ) }
                ]
            }),

            // Fixtures comes as JSON files, do not bundle these with the application
            // but concatenate and copy them to the output folder for runtime loading

            new MergeJsonWebpackPlugin({
                prefixFileName: true,
                output: {
                    groupBy: [
                        {
                            pattern: "./src/fixtures/instruments/**/*.json",
                            fileName: "./fixtures/Instruments.json"
                        },
                        {
                            pattern: "./src/fixtures/songs/**/*.json",
                            fileName: "./fixtures/Songs.json"
                        }
                    ]
                }
            })
        ],
        resolve: {
            fallback: {
                "buffer" : require.resolve( "buffer" ),
                "crypto" : require.resolve( "crypto-browserify" ),
                "util"   : require.resolve( "util/" ),
                "stream" : require.resolve( "stream-browserify" ),
            }
        }
    },
    chainWebpack: config => {
        // this solves an issue with hot module reload on Safari...
        config.plugins.delete( "preload" );
    },
};
