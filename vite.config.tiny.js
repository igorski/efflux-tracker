import { defineConfig } from "vite";
import path from "path";

const dirSrc = `${__dirname}/src`;

export default defineConfig({
    define: {
        __TINY__: true,
    },
    base: "./",
    build: {
        lib: {
            entry: path.resolve( `${dirSrc}/tiny-player/efflux-tiny-player.ts` ),
            name: "eTiny",
            fileName: "tiny",
            formats: [ "iife" ],
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled into the library
            // external: [ "mpg123-decoder" ],
        },
    },
    resolve: {
        modules: [ path.resolve( __dirname, "src/tiny-player/tiny_node_modules" ), "node_modules" ],
        alias: {
            "@": path.resolve( __dirname, "src" ),
            // use a custom, light-weight "fake Vue" (some utilities rely on Vue.set)
            "vue": path.resolve( __dirname, "src/tiny-player/tiny_node_modules/vue" )
        },
        extensions: [ ".ts", ".js", "..." ],
    },
});
