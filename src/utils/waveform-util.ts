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

/**
 * Renders the audio represented by given buffer to a HTMLCanvasDrawable image
 * of provided width and height
 */
export const bufferToWaveForm = (
    buffer: AudioBuffer, color: string, width = 400, height = 150, canvas?: HTMLCanvasElement
): HTMLCanvasElement => {
    canvas = canvas ?? document.createElement( "canvas" );
    const ctx     = canvas.getContext( "2d" )!;
    canvas.width  = width;
    canvas.height = height;

    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.beginPath();

    const amp = height / 2;
    const center = height / 2;
    const samplesPerPixel = buffer.length / width;
    const channelAmount = buffer.numberOfChannels;

    for ( let i = 0; i < width; ++i ) {
        const start = Math.floor( i * samplesPerPixel );
        const end   = Math.floor(( i + 1 ) * samplesPerPixel );

        // sample will be in -1 to +1 range
        let min = 0;
        let max = 0;
        
        for ( let j = start; j < end; ++j ) {
            let value = 0;
            for ( let c = 0; c < channelAmount; ++c ) {
                value += buffer.getChannelData( c )[ j ];
            }
            value /= channelAmount;
            if ( value < min ) {
                min = value;
            } else if ( value > max ) {
                max = value;
            }
        }
        const x = i + 0.5;
        let top = center + ( min * amp );
        let bottom = center + ( max * amp );

        // near silence should always render a clear line
        // (subpixel anti aliasing can reduce visibility)

        if ( Math.abs( bottom - top ) < 1 ) {
            top    = center - 0.5;
            bottom = center + 0.5;
        }

        ctx.moveTo( x, top );
        ctx.lineTo( x, bottom );
    }
    ctx.stroke();

    return canvas;
};