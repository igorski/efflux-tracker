const MergeJsonWebpackPlugin = require('merge-jsons-webpack-plugin');
const CopyWebpackPlugin      = require('copy-webpack-plugin');

const dirSrc    = `./src`;
const dirAssets = `${dirSrc}/assets`;

module.exports = {
    publicPath: './',
    filenameHashing: true,
    productionSourceMap: false,
    configureWebpack: {
        module: {
            rules: [
                {
                    // inline Workers as Blobs

                    test: /\.worker\.js$/,
                    use: { loader: 'worker-loader', options: { inline: true, fallback: false } }
                }
            ]
        },
        plugins: [

            new CopyWebpackPlugin([
                { from: `${dirAssets}/images/favicon`,  to: 'assets/favicon', flatten: false },
                { from: `${dirAssets}/images/logo.png`, to: 'assets',         flatten: false }
            ]),

            // Fixtures comes as JSON files, do not bundle these with the application
            // but concatenate and copy them to the output folder for runtime loading

            new MergeJsonWebpackPlugin({
                prefixFileName: true,
                output: {
                    groupBy: [
                        {
                            pattern: './src/fixtures/instruments/**/*.json',
                            fileName: './fixtures/Instruments.json'
                        },
                        {
                            pattern: './src/fixtures/songs/**/*.json',
                            fileName: './fixtures/Songs.json'
                        }
                    ]
                }
            })
        ]
    },
    chainWebpack: config => {
        // this solves an issue with hot module reload on Safari...
        config.plugins.delete('preload');
    }
};
