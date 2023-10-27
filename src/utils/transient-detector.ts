/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
import type { SampleRange } from "@/model/types/sample";

const FILTER_FREQ  = 150;
const FILTER_T     = 1 / ( 2 * Math.PI * FILTER_FREQ );
const RELEASE_TIME = 0.02; // in seconds

export const transientToSlices = ( buffer: AudioBuffer, threshold = 0.3, maxSlices = 32 ): SampleRange[] => {
    const out: SampleRange[] = [];

    const coeff        = 1 / ( buffer.sampleRate * FILTER_T );
    const releaseCoeff = Math.exp( -1 / ( buffer.sampleRate * RELEASE_TIME ));

    let Filter1Out = 0;
    let Filter2Out = 0;
    let PeakEnv = 0;          // Peak envelope follower
    let BeatTrigger = false;         // Schmitt trigger output
    let PrevBeatPulse = false;       // Rising edge memory
    let BeatPulse = false;           // Beat detector output

    let envelope: number;

    // @todo (?) we are only operating in mono here
    const samples = buffer.getChannelData( 0 );
    let rangeEnd  = samples.length;

    for ( let i = 0; i < rangeEnd; ++i ) {
        const input = samples[ i ];
      
        // Step 1 : 2nd order low pass filter (made of two 1st order RC filter)
        Filter1Out += ( coeff * ( input - Filter1Out ));
        Filter2Out += ( coeff * ( Filter1Out - Filter2Out ));

        // Step 2 : peak detector
        envelope = Math.abs( Filter2Out );

        if ( envelope > PeakEnv ) {
            PeakEnv = envelope;  // Attack time = 0
        } else {
            PeakEnv *= releaseCoeff;
            PeakEnv += ( 1 - releaseCoeff ) * envelope;
        }

        // Step 3 : Schmitt trigger
        if ( !BeatTrigger ) {
            if ( PeakEnv > threshold ) {
                BeatTrigger = true;
            }
        } else if ( PeakEnv < 0.15 ) {
            BeatTrigger = false;
        }

        // Step 4 : rising edge detector
        BeatPulse = BeatTrigger && !PrevBeatPulse;

        if ( BeatPulse ) {
            out.push({ rangeStart: i, rangeEnd });

            if ( out.length === maxSlices ) {
                break;
            }
        }
        PrevBeatPulse = BeatTrigger;
    }

    let sliceAmount = out.length;

    while ( sliceAmount-- ) {
        const slice = out[ sliceAmount ];
        slice.rangeEnd = rangeEnd;
        rangeEnd = slice.rangeStart;
    }
    return out;
};
