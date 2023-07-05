import { defineConfig } from "vite";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import path from "path";

const dirSrc = `${__dirname}/src`;
console.warn(dirSrc);
// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    build: {
        lib: {
            entry: path.resolve( `${dirSrc}/tiny-player/efflux-tiny-player.ts` ),
            name: "eTiny",
            fileName: "tiny",
            formats: [ "iife" ],
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: [ "vue", "mpg123-decoder" ],
        },
    },
    resolve: {
        modules: [ path.resolve( __dirname, "src/tiny-player/tiny_node_modules" ), "node_modules" ],
        alias: {
            "@": path.resolve( __dirname, "src" )
        },
        extensions: [ ".ts", ".js", "..." ],
    },
    optimizeDeps: {
        esbuildOptions: {
            // Node.js global to browser globalThis
            define: {
                global: "globalThis"
            },
            plugins: [
               NodeGlobalsPolyfillPlugin({
                   buffer: true,
                   crypto: true,
                   util: true,
                   stream: true
               })
           ]
        }
    },
});
/*

module.exports = {

    entry: {
        tiny: "./src/tiny-player/efflux-tiny-player.ts"
    },
    output: {
        library: "eTiny",
        libraryTarget: "var",
        libraryExport: "default"
    }
};*/
