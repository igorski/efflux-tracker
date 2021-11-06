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
import AudioService from "@/services/audio-service";
import { sliceBuffer } from "@/utils/sample-util";

const SampleFactory = {
    /**
     * Wraps an AudioBuffer into a sample Object
     * which can be serialized into a Song.
     */
    fromBuffer( buffer, name = "New sample" ) {
        return {
            name,
            buffer,
            rangeStart: 0,
            rangeEnd: buffer.duration,
            pitch: null // @see sample-editor
        };
    },

    /**
     * Retrieves the appropriate buffer for playback of the sample.
     * In case the sample has a custom playback range, a new AudioBuffer
     * will be sliced. For repeated playback this should be cached and
     * invalidated when appropriate.
     *
     * @param {Object} sample
     * @param {AudioContext} audioContext
     * @returns {AudioBuffer}
     */
    getBuffer( sample, audioContext ) {
        if ( sample.rangeStart === 0 && sample.rangeEnd === sample.buffer.duration ) {
            return sample.buffer;
        }
        return sliceBuffer( audioContext, sample.buffer, sample.rangeStart, sample.rangeEnd );
    },

    disassemble( sample ) {
        // TODO : this is very brute force but should be safe (Float32 is JS Number resolution
        // as serializable into JSON). These structures can get very big quickly though.
        // this is stupid. serialize the sample file instead.
        const { sampleRate, numberOfChannels, length } = sample.buffer;
        const channels = [];
        for ( let c = 0; c < numberOfChannels; ++c ) {
            const channel = [];
            const inChannel = sample.buffer.getChannelData( c ); // Float32Array
            for ( let i = 0; i < length; ++i ) {
                channel[ i ] = inChannel[ i ];
            }
            channels.push( channel );
        }
        return {
            n: sample.name,
            s: sample.rangeStart,
            e: sample.rangeEnd,
            p: sample.pitch,
            b: {
                s: sampleRate,
                n: numberOfChannels,
                l: length,
                c: channels
            }
        };
    },

    assemble( xtkSample ) {
        const buffer = AudioService.getAudioContext().createBuffer( xtkSample.b.n, xtkSample.b.l, xtkSample.b.s );
        for ( let c = 0; c < xtkSample.b.c.length; ++c ) {
            const inChannel = xtkSample.b.c[ c ];
            const outBuffer = buffer.getChannelData( c );
            for ( let i = 0, l = inChannel.length; i < l; ++i ) {
                outBuffer[ i ] = inChannel[ i ];
            }
        }
        const sample = SampleFactory.fromBuffer( buffer, xtkSample.n );

        sample.rangeStart = xtkSample.s;
        sample.rangeEnd   = xtkSample.e;
        sample.pitch      = xtkSample.p;

        return sample;
    }
};
export default SampleFactory;
