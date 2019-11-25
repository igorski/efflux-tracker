module.exports = {
    mode: 'production',
    entry: {
        tiny: './src/efflux-tiny-player.js'
    },
    output: {
        library: 'eTiny',
        libraryTarget: 'var',
        libraryExport: 'default'
    }
};
