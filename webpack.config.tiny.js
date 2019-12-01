const path = require('path');

module.exports = {
    mode: 'production',
    resolve: {
        modules: [path.resolve(__dirname, 'src/tiny-player/tiny_node_modules'), 'node_modules'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    module: {
        rules: [
            {
                // inline Workers as Blobs

                test: /\.worker\.js$/,
                use: { loader: 'worker-loader', options: { inline: true, fallback: false } }
            }
        // uncomment to prevent transpilation to ES2015 (increases filesize)
        // TODO: requires tweaking of suitable target, and also needs to be tailored to your intended target environment
        /*
        , {
            test: /\.js$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env']
                }
            }
        }*/
        ]
    },
    entry: {
        tiny: './src/tiny-player/efflux-tiny-player.js'
    },
    output: {
        library: 'eTiny',
        libraryTarget: 'var',
        libraryExport: 'default'
    }
};
