const path = require( "path" );

module.exports = {
    mode: "production",
    resolve: {
        modules: [path.resolve(__dirname, "src/tiny-player/tiny_node_modules"), "node_modules"],
        alias: {
            "@": path.resolve(__dirname, "src")
        },
        extensions: [ ".ts", ".js", "..." ],
    },
    module: {
        rules: [
            { test: /\.ts/, use: "babel-loader" },
            // comment to prevent transpilation to ES2015 (as it increases filesize)
            /*, {
                test: /\.js$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [ "@babel/preset-env" ],
                    }
                }
            }
            */
        ]
    },
    entry: {
        tiny: "./src/tiny-player/efflux-tiny-player.ts"
    },
    output: {
        library: "eTiny",
        libraryTarget: "var",
        libraryExport: "default"
    }
};
