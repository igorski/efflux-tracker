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
import { getAudioContext } from "@/services/audio-service";
import { createOfflineAudioContext } from "@/services/audio/webaudio-helper";
import { loadSample } from "@/services/audio/sample-loader";
import { sliceBuffer } from "@/utils/sample-util";
import { fileToBase64, base64ToBlob } from "@/utils/file-util";

const SampleFactory = {
    /**
     * Wraps a binary source and AudioBuffer into a sample Object
     * which can be serialized into a Song.
     *
     * @param {File|Blob|String} source
     * @param {AudioBuffer} buffer
     * @param {String=} name
     */
    create( source, buffer, name = "New sample" ) {
        return {
            name,
            source,
            buffer,
            rangeStart : 0,
            rangeEnd   : buffer.duration,
            rate       : buffer.sampleRate, // in Hz
            length     : buffer.duration,   // in seconds
            pitch      : null, // @see sample-editor
            repitch    : true, // whether to actually apply repitching
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

    /**
     * Disassembles a sample Object into a serialized .XTK sample
     *
     * @param {Object} sample
     * @return {Object}
     */
    disassemble( sample ) {
        let source;
        const toJSON = () => {
            return {
                b  : source,
                n  : sample.name,
                s  : sample.rangeStart,
                e  : sample.rangeEnd,
                p  : sample.pitch,
                r  : sample.repitch,
                sr : sample.rate,
                l  : sample.length,
            };
        };
        return new Promise(( resolve, reject ) => {
            // we serialize the source instead of the buffer
            // a the latter is uncompressed audio and thus significantly larger
            // this serialization will only happen on first save as the
            // deserializer will keep the source intact
            source = sample.source;
            if ( source instanceof Blob ) { // also true for Files
                fileToBase64( source )
                    .then( result => {
                        source = result;
                        resolve( toJSON() );
                    }).catch( reject );
            } else {
                resolve( toJSON() );
            }
        });
    },

    /**
     * assembles a sample Object from a serialized XTK sample
     *
     * @param {Object} xtkSample
     * @return {Promise<Object|null>}
     */
    assemble( xtkSample ) {
        return new Promise( async resolve => {
            try {
                const source = await base64ToBlob( xtkSample.b );
                const rate   = xtkSample.sr || getAudioContext().sampleRate;
                const length = xtkSample.l  || 120;

                const buffer = await loadSample( source, createOfflineAudioContext( length, rate ));
                if ( !buffer ) {
                    throw Error();
                }
                const sample = SampleFactory.create( source, buffer, xtkSample.n );

                sample.rangeStart = xtkSample.s;
                sample.rangeEnd   = xtkSample.e;
                sample.pitch      = xtkSample.p;
                sample.repitch    = xtkSample.r;
                sample.rate       = buffer.sampleRate;
                sample.length     = buffer.duration;

                // curious : when loading samples, sometimes the range end is beyond the
                // buffer duration. This is likely because of different sample rates used
                // in the environment that created and the one that is loading the sample.

                if ( sample.rangeEnd > sample.length ) {
                    sample.rangeEnd = sample.length;
                    // eslint-disable-next-line no-console
                    console?.warn( `Corrected duration for sample "${xtkSample.n}" with saved rate ${xtkSample.sr} against current rate ${buffer.sampleRate}` );
                }

                resolve( sample );
            } catch {
                resolve( null );
            }
        });
    }
};
export default SampleFactory;
