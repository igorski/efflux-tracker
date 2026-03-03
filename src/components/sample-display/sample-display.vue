/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2026 - https://www.igorski.nl
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
        :width="width"
        :height="height"
    ></canvas>
</template>

<script lang="ts">
import { type Sample, PlaybackType } from "@/model/types/sample";
import { bufferToWaveForm } from "@/utils/waveform-util";

export default {
    props: {
        sample: {
            type: Object,
            default: null,
        },
        width: {
            type: Number,
            required: true,
        },
        height: {
            type: Number,
            required: true,
        },
        color: {
            type: String,
            default: "#FF5900"
        },
        offsetLeft: {
            type: Number,
            default: 0, // 0 - 1 range
        },
        scale: {
            type: Number,
            default: 1,
        },
    },
    computed: {
        showSlices(): boolean {
            return this.sample.type === PlaybackType.SLICED && this.sample.slices?.length > 0;
        },
        contentWidth(): number {
            return this.width * this.scale;
        },
    },
    watch: {
        sample: {
            immediate: true,
            async handler( sample: Sample, oldSample?: Sample ): Promise<void> {
                if ( sample?.buffer !== oldSample?.buffer ) {
                    await this.$nextTick(); // wait for component to mount on first run
                    this.render( sample.buffer );
                }
            }
        },
        "sample.type": {
            handler( _type: PlaybackType ): void {
                this.render( this.sample.buffer );
            },
        },
        "sample.slices": {
            handler(): void {
                this.render( this.sample.buffer );
            },
        },
        scale: {
            handler(): void {
                this.render( this.sample.buffer );
            },
        },
        offsetLeft: {
            handler(): void {
                this.update();
            },
        },
    },
    mounted(): void {
        // pool a canvas for reuse to prevent reallocation overhead
        this.tempCanvas = document.createElement( "canvas" ) as HTMLCanvasElement;
    },
    beforeUnmount(): void {
        this.tempCanvas.width = this.tempCanvas.height = 1;
        this.tempCanvas = null;
    },
    methods: {
        render( buffer: AudioBuffer ): void {
            bufferToWaveForm( buffer, this.color, this.contentWidth, this.height, this.tempCanvas );

            if ( this.showSlices ) {
                const scale = this.contentWidth / buffer.length;
                const ctx = this.tempCanvas.getContext( "2d" ) as CanvasRenderingContext2D;

                for ( const slice of this.sample.slices ) {
                    const sliceWidth = 0.5 // slice.rangeEnd - slice.rangeStart;
                    ctx.fillStyle = "#FFF";
                    ctx.fillRect( slice.rangeStart * scale, 0, sliceWidth, this.height );
                }
            }
            this.update();
        },
        update(): void {
            const canvas = this.$refs.waveformDisplay as HTMLCanvasElement;
            const ctx    = canvas.getContext( "2d" ) as CanvasRenderingContext2D;
            ctx.imageSmoothingEnabled = false;

            const { width, height } = this;
            const offsetLeft = -this.offsetLeft * ( this.contentWidth - width );

            ctx.clearRect( 0, 0, width, height );
            ctx.drawImage( this.tempCanvas, offsetLeft, 0, this.contentWidth, height );
        },
    }
};
</script>

<style lang="scss" scoped>
@use "@/styles/colors";
@use "@/styles/_mixins";
@use "@/styles/_variables";

.sample-canvas {
    width: 100%;
    height: variables.$sample-waveform-height;
    cursor: grab;
    background-color: #000;
    image-rendering: pixelated;
    image-rendering: crisp-edges;

    @include mixins.mobile() {
        height: variables.$sample-waveform-height-mobile;
    }
}
</style>
