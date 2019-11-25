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
        // uncomment to prevent transpilation to ES2015 (increases filesize)
        // TODO: requires tweaking of suitable target, and also needs to be
        // tailored to your target environment, obviously
        /*
        rules: [{
            test: /\.js$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env']
                }
            }
        }]
        */
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
