/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import OscillatorTypes from "@/definitions/oscillator-types";
import type { Sample } from "@/model/types/sample";

/**
 * type definition for an instrument
 * id matches the index in the songs instrument list
 *
 * @see InstrumentFactory, InstrumentValidator
 */
export type Instrument = {
    index: number;
    name: string;
    presetName: string | null;
    oscillators: InstrumentOscillator[],
    volume: number;
    panning: number;
    muted: false;
    solo: false;
    overdrive?: {
        enabled: boolean;
        preBand: number;
        postCut: number;
        color:   number;
        drive:   number;
    },
    eq?: {
        enabled  : boolean;
        lowGain  : number;
        midGain  : number;
        highGain : number;
    },
    filter : {
        enabled     : boolean;
        frequency   : number;
        q           : number;
        speed       : number;
        depth       : number;
        type        : string;
        lfoType     : string;
    },
    delay : {
        enabled  : boolean;
        type     : number;
        time     : number;
        feedback : number;
        cutoff   : number;
        offset   : number;
        dry      : number;
    }
};

/**
 * type definition for an instruments oscillator
 * waveform is an enumeration which can be any of @/definitions/oscillator-types
 *
 * the table Array holds numerical values in the -1 to +1 range
 * describing a bipolar waveform for the oscillator to use when waveform is CUSTOM
 *
 * octaveShift (-2 to +2)
 * fineShift (-7 to +7)
 *
 * ADSR values are envelope operations in seconds
 *
 * @see InstrumentFactory, InstrumentValidator
 */
export type InstrumentOscillator = {
    enabled     : boolean;
    waveform    : OscillatorTypes;
    table       : number[] | number,
    volume      : number;
    detune      : number;
    octaveShift : number;
    fineShift   : number;
    sample      : string;
    adsr        : InstrumentAmplitudeEnvelopes,
    pitch?      : InstrumentPitchEnvelopes;
};

export type InstrumentAmplitudeEnvelopes = {
    attack : number;
    decay  : number;
    sustain: number;
    release: number;
};

export type InstrumentPitchEnvelopes = {
    range  : number;
    attack : number;
    decay  : number;
    sustain: number;
    release: number;
};
