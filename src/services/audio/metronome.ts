/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2025 - https://www.igorski.nl
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
import { reactive } from "vue";
import { beep } from "./webaudio-helper";

/**
 * Metronome is a component of the transporter
 * and can sound a beep at select positions within the sequence
 */
export default
{
    enabled : reactive({
        value: false
    }),
    restore         : false,
    countIn         : false,
    countInComplete : false,

    /**
     * sound the metronome at given time for given currentStep
     * give resolution of the metronome is specified as:
     * 0 == 16th (semi-quaver), 1 == 8th (quaver), 2 == 4th (quarter) note
     */
    play( resolution: number, currentStep: number, maxStep: number, time: number, audioContext: BaseAudioContext ): void
    {
        if (( resolution === 1 ) && ( currentStep % ( maxStep / 8 )))
            return; // we're not playing non-8th 16th notes

        if (( resolution == 2 ) && ( currentStep % ( maxStep / 4 ) ))
            return; // we're not playing non-quarter 8th notes

        let pitch = 220; // default note has low pitch, except for:

        const isFirstBeat = ( currentStep % maxStep ) === 0;

        if ( isFirstBeat )
            pitch = 440; // beat 0 == medium pitch

        else if ( currentStep % ( maxStep / 4 ))
            pitch = 880; // quarter notes = high pitch

        beep( audioContext, pitch, time, 0.05 );
    }
};
