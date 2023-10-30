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
import type { XTKSample } from "@/model/serializers/sample-serializer";
import { type Sample, PlaybackType } from "@/model/types/sample";
import { getAudioContext } from "@/services/audio-service";
import { createOfflineAudioContext } from "@/services/audio/webaudio-helper";
import { loadSample } from "@/services/audio/sample-loader";
import { sliceBuffer } from "@/utils/sample-util";
import { base64ToBlob } from "@/utils/file-util";

// only used internally during a session
// samples are referenced (by instruments) through their name
let uid = 0;
const generateUid = (): number => ++uid;

const SampleFactory = {
    /**
     * Wraps a binary source and AudioBuffer into a sample Object
     * which can be serialized into a Song.
     */
    create( source: File | Blob | string, buffer: AudioBuffer, name: string = "New sample", type = PlaybackType.REPITCHED ): Sample {
        return {
            id: `s${generateUid()}`,
            name,
            source,
            buffer,
            rangeStart : 0,
            rangeEnd   : buffer.duration,
            rate       : buffer.sampleRate,
            duration   : buffer.duration,
            loop       : false,
            pitch      : null, // @see sample-editor
            slices     : [],
            type,
        };
    },

    /**
     * Retrieves the appropriate buffer for playback of the sample.
     * In case the sample has a custom playback range, a new AudioBuffer will be sliced.
     * In case the sample has multiple sliced regions, this method should be called providing the rangeStart|End
     * values for each of the regions to slice. Provided values are in seconds, relative to the sample buffer duration.
     * 
     * For repeated playback, the returned AudioBuffer should be cached and invalidated when appropriate.
     */
    getBuffer( sample: Sample, audioContext: BaseAudioContext, rangeStart = sample.rangeStart, rangeEnd = sample.rangeEnd ): AudioBuffer {
        if ( rangeStart === 0 && rangeEnd === sample.buffer.duration ) {
            return sample.buffer;
        }
        return sliceBuffer( audioContext, sample.buffer, rangeStart, rangeEnd );
    },

    /**
     * deserializes a sample Object from a serialized XTK sample
     */
    deserialize( xtkSample: XTKSample ): Promise<Sample | null> {
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
                sample.loop       = xtkSample.lp ?? true;
                sample.pitch      = xtkSample.p;
                sample.rate       = buffer.sampleRate;
                sample.duration   = buffer.duration;

                // curious : when loading samples, sometimes the range end is beyond the
                // buffer duration. This is likely because of different sample rates used
                // in the environment that created and the one that is loading the sample.

                if ( sample.rangeEnd > sample.duration ) {
                    sample.rangeEnd = sample.duration;
                    // eslint-disable-next-line no-console
                    //console?.warn( `Corrected duration for sample "${xtkSample.n}" with saved rate ${xtkSample.sr} against current rate ${buffer.sampleRate}` );
                }

                sample.slices = xtkSample.sl?.map(({ s, e }) => ({ rangeStart: s, rangeEnd: e })) ?? [];

                // @ts-expect-error 'r' no longer exists in XTKSample, but it did in the legacy format
                if ( typeof xtkSample.r !== undefined && xtkSample.t === undefined ) {
                    // @ts-expect-error
                    sample.type = !!xtkSample.r ? PlaybackType.REPITCHED : PlaybackType.DEFAULT;
                } else {
                    sample.type = xtkSample.t;
                }

                if ( !!xtkSample.ep ) {
                    try {
                        sample.editProps = JSON.parse( xtkSample.ep );
                    } catch {}
                }

                resolve( sample );
            } catch {
                resolve( null );
            }
        });
    }
};
export default SampleFactory;
