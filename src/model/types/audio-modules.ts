/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2022 - https://www.igorski.nl
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
export type FilterModule = {
    filter: BiquadFilterNode;
    lfo: OscillatorNode;
    lfoAmp: GainNode;
    lfoEnabled: boolean;
    filterEnabled: boolean;
};

export type EqModule = {
    lowBand: BiquadFilterNode;
    midBand: BiquadFilterNode;
    highBand: BiquadFilterNode;
    lowGain: GainNode;
    midGain: GainNode;
    highGain: GainNode;
    output: AudioNode;
    eqEnabled: boolean;
};

// structure used by Delay (see delay-module) and Overdrive

export type WrappedAudioNode = {
    input: AudioNode;
    output: AudioNode;
};

export type DelayModule = {
    delay: WrappedAudioNode & {
        type: number;
        feedback: number;
        cutoff: number;
        delay: number;
        offset: number;
        dry?: number;
    },
    delayEnabled: boolean;
};

export type OverdriveModule = {
    overdrive: AudioNode & {
        drive: number;
        color: number;
        preBand: number;
        postCut: number;
    };
    overdriveEnabled: boolean;
};
