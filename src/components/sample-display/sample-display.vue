/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
<template>
    <canvas
        ref="waveformDisplay"
        class="sample-canvas"
        v-on="$listeners"
    ></canvas>
</template>

<script>
import { bufferToWaveForm } from "@/utils/sample-util";

export default {
    props: {
        sample: {
            type: Object,
            default: null,
        },
        color: {
            type: String,
            default: "#FF5900"
        },
    },
    watch: {
        sample: {
            immediate: true,
            async handler( sample ) {
                if ( sample?.buffer ) {
                    await this.$nextTick(); // wait for component to mount on first run
                    this.render( sample.buffer );
                }
            }
        },
    },
    methods: {
        render( buffer ) {
            const canvas = this.$refs.waveformDisplay;
            const ctx    = canvas.getContext( "2d" );
            ctx.imageSmoothingEnabled = false;

            const { width, height } = canvas;

            ctx.clearRect( 0, 0, width, height );
            ctx.drawImage( bufferToWaveForm( buffer, this.color, 720, 200 ), 0, 0, width, height );
        }
    }
};
</script>

<style lang="scss" scoped>
@import "@/styles/colors";
@import "@/styles/_variables";

.sample-canvas {
    width: 100%;
    height: $sampleWaveformHeight;
    cursor: grab;
    background-color: #000;
}
</style>
