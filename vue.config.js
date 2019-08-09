const MergeJsonWebpackPlugin = require('merge-jsons-webpack-plugin');
//const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {

    filenameHashing: false,
    productionSourceMap: false,

    configureWebpack: {
        module: {
            rules: [
                {
                    // inline Workers as Blobs

                    test: /\.worker\.js$/,
                    use: { loader: 'worker-loader', options: { inline: true, fallback: false } }
                },
                {
                    // we use DSP.js to provide Discrete Fourier Transform. This is a NPM module, but does not use
                    // CommonJS / AMD / ES6 module. Include and inline in global namespace...

                    test: /\.dspjs$/,
                    use: [ 'script-loader' ]
                }
            ]
        },
        plugins: [

            //new CopyWebpackPlugin([
            //    { from: '' },
            //]),

            // Fixtures comes as JSON files, do not bundle these with the application
            // but concatenate and copy them to the output folder for runtime loading

            new MergeJsonWebpackPlugin({
                prefixFileName:true,
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
        ],
    },
};
