/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2021-2023 - https://www.igorski.nl
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

<script lang="ts">
import { type Sample, PlaybackType } from "@/model/types/sample";

/**
 * Renders the audio represented by given buffer to a HTMLCanvasDrawable image
 * of provided width and height
 */
const bufferToWaveForm = ( buffer: AudioBuffer, color: string, width = 400, height = 150 ): HTMLCanvasElement => {
    const canvas  = document.createElement( "canvas" );
    const ctx     = canvas.getContext( "2d" )!;
    canvas.width  = width;
    canvas.height = height;

    ctx.fillStyle = color;

    // @todo: render all channels ? (this is left channel mono currently)
    const data = buffer.getChannelData( 0 );
    const step = Math.ceil( data.length / width );
    const amp  = height / 2;

    for ( let i = 0; i < width; ++i ) {
        let min = 1.0;
        let max = -1.0;
        for ( let j = 0; j < step; ++j ) {
            const value = data[( i * step ) + j ];
            if ( value < min ) {
                min = value;
            } else if ( value > max ) {
                max = value;
            }
        }
        ctx.fillRect( i, ( 1 + min ) * amp, 1, Math.max( 1, ( max - min ) * amp ));
    }
    return canvas;
};

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
    computed: {
        hasSlices(): boolean {
            console.info('sample-display update hasSlices')
            return this.sample.type === PlaybackType.SLICED && this.sample.slices?.length > 0;
        },
    },
    watch: {
        sample: {
            immediate: true,
            async handler( sample: Sample, oldSample?: Sample ): Promise<void> {
                if ( sample?.buffer !== oldSample?.buffer )
                {
                    await this.$nextTick(); // wait for component to mount on first run
                    this.render( sample.buffer );
                }
            }
        },
        "sample.slices": {
            handler(): void {
                this.render( this.sample.buffer );
            },
        },
    },
    methods: {
        render( buffer: AudioBuffer ): void {
            const canvas = this.$refs.waveformDisplay;
            const ctx    = canvas.getContext( "2d" );
            ctx.imageSmoothingEnabled = false;

            const { width, height } = canvas;

            ctx.clearRect( 0, 0, width, height );
            ctx.drawImage( bufferToWaveForm( buffer, this.color, width, height ), 0, 0, width, height );

            if ( this.hasSlices ) {
                const scale = width / buffer.length;
                for ( const slice of this.sample.slices ) {
                    // const sliceWidth = slice.rangeEnd - slice.rangeStart;
                    ctx.fillStyle = "#FFF";
                    ctx.fillRect( slice.rangeStart * scale, 0, 0.5, height );
                }
            }
        },
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
