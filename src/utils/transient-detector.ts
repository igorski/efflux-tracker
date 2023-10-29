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

/**
 * Scans given buffer for transients (defined by provided threshold levels).
 * Whenever a new transient is found, this is mapped to a new sample range and
 * added to a list (with a maximum size of provided maxSlices in length)
 * 
 * The transients are detected using a low pass filter, envelope following and
 * a Schmitt trigger. 
 */
export const mapTransients = ( buffer: AudioBuffer, threshold = 0.3, filterFreq = 150, releaseMs = 0.02, maxSlices = 256 ): SampleRange[] => {
    const out: SampleRange[] = [];

    const FILTER_T     = 1 / ( 2 * Math.PI * filterFreq );
    const coeff        = 1 / ( buffer.sampleRate * FILTER_T );
    const releaseCoeff = Math.exp( -1 / ( buffer.sampleRate * releaseMs ));

    let filteredInput1  = 0;
    let filteredInput2  = 0;
    let peakEnvFollower = 0;

    let hasTrigger   = false; 
    let hasTransient = false; // whether a transient was identified in the preceding sample(s)
    let envelope: number;

    const peakThreshold = threshold / 2; /* 0.15 when threshold is 0.3 */

    // @todo (?) we are only operating in mono here
    const samples = buffer.getChannelData( 0 );
    let rangeEnd  = samples.length;

    for ( let i = 0; i < rangeEnd; ++i ) {
        const input = samples[ i ];
      
        filteredInput1 += ( coeff * ( input - filteredInput1 ));
        filteredInput2 += ( coeff * ( filteredInput1 - filteredInput2 ));

        // detect the peaks
        envelope = Math.abs( filteredInput2 );

        if ( envelope > peakEnvFollower ) {
            peakEnvFollower = envelope;
        } else {
            peakEnvFollower *= releaseCoeff;
            peakEnvFollower += ( 1 - releaseCoeff ) * envelope;
        }

        // set the Schmitt trigger when the envelope exceeds the threshold
        if ( !hasTrigger ) {
            if ( peakEnvFollower > threshold ) {
                hasTrigger = true;
            }
        } else if ( peakEnvFollower < peakThreshold ) {
            hasTrigger = false;
        }

        // if the trigger was set and the current sample is not within the tail of a previously identified
        // transient, we can now consider this sample to be a new transient
        const isNewTransient = hasTrigger && !hasTransient;

        if ( isNewTransient ) {
            out.push({ rangeStart: i, rangeEnd });
            if ( out.length === maxSlices ) {
                break;
            }
        }
        // as long as the Schmitt trigger is set we are inside the tail of a transient
        hasTransient = hasTrigger;
    }

    // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
    if ( import.meta.env.MODE !== "production" ) {
        console.info( `Sliced ${out.length} regions at threshold ${threshold}, LPF ${filterFreq} and release ${releaseMs}` );
    }

    // format the range values for all found transients
    let sliceAmount = out.length;
    while ( sliceAmount-- ) {
        const slice = out[ sliceAmount ];
        slice.rangeEnd = rangeEnd;
        rangeEnd = slice.rangeStart;
    }
    return out;
};
