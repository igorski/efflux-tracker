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
import { type EffluxTimingMeta } from "@/model/types/song";
import { roundToNearest } from "@/utils/number-util";

 /**
  * get the duration of a measure (at given time signature and tempo in BPM) in seconds
  */
 export const getMeasureDurationInSeconds = ( timing: EffluxTimingMeta ): number => {
    const { tempo, timeSigNumerator } = timing;
    return ( 60 / tempo ) * timeSigNumerator;
 };

/**
 * get the duration of a measure (at given time signature and tempo in BPM) in milliseconds
 */
export const getMeasureDurationInMs = ( timing: EffluxTimingMeta ): number => {
    return getMeasureDurationInSeconds( timing ) * 1000;
};

/**
 * get the frequency in Hz for given duration in milliseconds
 */
export const msToFrequency = ( milliSeconds: number ): number => {
    return 1000 / milliSeconds;
};

/**
 * Returns the amount of samples necessary to hold provided value in seconds at the provided sample rate
 */
export const secondsToSamples = ( seconds: number, sampleRate: number ): number => {
    return Math.round( seconds * sampleRate );
};

/**
 * Takes provided interval in seconds and adjusts it to a value
 * that is in sync with the beat as defined by the provided tempo and time signature
 * 
 * @param intervalInSeconds the value in seconds of the interval
 * @param timing the current timing of the song
 * @param subdivision the resolution within a beat, e.g. 16 for 16th note, 8 for 8th note, etc.
 */
export const syncIntervalWithBeat = ( intervalInSeconds: number, timing: EffluxTimingMeta, subdivision = 16 ): number => {
    return roundToNearest( intervalInSeconds, getMeasureDurationInSeconds( timing ) / subdivision );
};
