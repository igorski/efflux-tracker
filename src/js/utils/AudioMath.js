/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
"use strict";

module.exports =
{
    /**
     * get the duration of a measure (at given time signature and
     * tempo in BPM) in milliseconds
     *
     * @public
     * @param {number} bpm the current BPM
     * @param {number} beatsPerMeasure amount of beats per measure, when in
     *                 doubt, use the upper numeral in a time signature (e.g. the "3" in 3/4)
     * @return {number} duration in milliseconds
     */
    getMeasureDurationInMs( bpm, beatsPerMeasure )
    {
        return ( beatsPerMeasure / ( bpm / 60 )) * 1000;
    },

    /**
     * get the frequency in Hz for given duration in milliseconds
     *
     * @public
     * @param {number} milliSeconds
     * @return {number} frequency in Hz
     */
    msToFrequency( milliSeconds )
    {
        return 1000 / milliSeconds;
    }
};
