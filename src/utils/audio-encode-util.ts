/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2022-2026 - https://www.igorski.nl
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
// @ts-expect-error no type definitions for audio-encoder
import AudioEncoder from "audio-encoder";
import { type Sample } from "@/model/types/sample";
import { loadSample } from "@/services/audio/sample-loader";
import { isEqualFloat } from "@/utils/number-util";
import { MP3_PAD_START, resampleBuffer } from "@/utils/sample-util";

const MAX_SAMPLE_RATE = 44100; // audio-encoder only supports max sample rate of 44.1 kHz
const BIT_RATE = 192;

/**
 * Re-encodes the source buffer of given sample, this can be used
 * to compress saved songs to occupy less storage resources
 */
export const encodeSampleSource = async (
    audioContext: BaseAudioContext, sample: Sample,
    progressHandler?: ( progress: number ) => void, buffer: AudioBuffer = sample.buffer
): Promise<Sample> => {
    
    if ( buffer.sampleRate !== MAX_SAMPLE_RATE ) {
        buffer = await resampleBuffer( buffer, MAX_SAMPLE_RATE );
    }
    const { duration } = buffer;

    return new Promise( resolve => {
        AudioEncoder( buffer, BIT_RATE, ( progress: number ) => {
            progressHandler?.( progress );
        },
        async ( blob: Blob ) =>
        {
            // we generate the buffer again as the encoded file might
            // have slightly different sample lengths (otherwise rangeEnd
            // will not be 100 % upon opening this saved sample once more)

            buffer = await loadSample( blob, audioContext );

            // an encoded MP3 is expected to have a longer duration than the source https://lame.sourceforge.io/tech-FAQ.txt
            // we expect 1057 padded samples at the start which translator to a delta to offset the ranges by

            const startDelta = buffer.duration > duration ? MP3_PAD_START / buffer.sampleRate : 0;
            const rangeStart = sample.rangeStart + startDelta;
            
            // note we keep the original duration for the new range (MP3 also has padded samples at the end)
            const rangeEnd = isEqualFloat( sample.rangeEnd, duration ) ? buffer.duration : Math.min( buffer.duration, sample.rangeEnd + startDelta );

            resolve({
                ...sample,
                source : blob,
                buffer,
                rate : buffer.sampleRate,
                duration : buffer.duration,
                optimized : true,
                rangeStart,
                rangeEnd,
            });
        });
    });
};
