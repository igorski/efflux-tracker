module.exports = {

    // Webpack configuration

    configureWebpack: {
        module: {
            // inline Workers as Blobs
            rules: [{
                test: /\.worker\.js$/,
                use: { loader: 'worker-loader', options: { inline: true, fallback: false } }
            }]
        }
    }
};
