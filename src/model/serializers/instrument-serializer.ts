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
import type { Instrument, InstrumentOscillator } from "@/model/types/instrument";
import OscillatorTypes from "@/definitions/oscillator-types";
import InstrumentFactory from "@/model/factories/instrument-factory";
import WaveTables from "@/services/audio/wave-tables";

/**
 * keys used when serializing Song factory
 * Objects into their JSON representation
 */
export const INSTRUMENTS = "ins";

export const INSTRUMENT_INDEX            = "i";
export const INSTRUMENT_NAME             = "n";
export const INSTRUMENT_PRESET_NAME      = "pn";
export const INSTRUMENT_VOLUME           = "v";
export const INSTRUMENT_PANNING          = "ip";
export const INSTRUMENT_MUTED            = "im";
export const INSTRUMENT_SOLOD            = "is";

export const INSTRUMENT_DELAY            = "d";
export const INSTRUMENT_DELAY_ENABLED    = "e";
export const INSTRUMENT_DELAY_CUTOFF     = "c";
export const INSTRUMENT_DELAY_DRY        = "dr";
export const INSTRUMENT_DELAY_FEEDBACK   = "f";
export const INSTRUMENT_DELAY_OFFSET     = "o";
export const INSTRUMENT_DELAY_TIME       = "t";
export const INSTRUMENT_DELAY_TYPE       = "tp";
export const INSTRUMENT_DELAY_SYNC       = "ds";

export const INSTRUMENT_FILTER           = "f";
export const INSTRUMENT_FILTER_ENABLED   = "e";
export const INSTRUMENT_FILTER_DEPTH     = "d";
export const INSTRUMENT_FILTER_FREQUENCY = "f";
export const INSTRUMENT_FILTER_LFO_TYPE  = "lt";
export const INSTRUMENT_FILTER_Q         = "q";
export const INSTRUMENT_FILTER_SPEED     = "s";
export const INSTRUMENT_FILTER_TYPE      = "ft";

export const INSTRUMENT_EQ               = "eq";
export const INSTRUMENT_EQ_ENABLED       = "e";
export const INSTRUMENT_EQ_LOW           = "l";
export const INSTRUMENT_EQ_MID           = "m";
export const INSTRUMENT_EQ_HIGH          = "h";

export const INSTRUMENT_OD               = "od";
export const INSTRUMENT_OD_ENABLED       = "e";
export const INSTRUMENT_OD_PREBAND       = "pb";
export const INSTRUMENT_OD_POSTCUT       = "pc";
export const INSTRUMENT_OD_COLOR         = "c";
export const INSTRUMENT_OD_DRIVE         = "d";

export const WAVE_TABLES                 = "wt";

export const INSTRUMENT_OSCILLATORS  = "o";
export const OSCILLATOR_ENABLED      = "e";
export const OSCILLATOR_ADSR         = "a";
export const OSCILLATOR_PITCH        = "pe";
export const OSCILLATOR_PITCH_RANGE  = "pr";

// ADSR used for both amplitude and pitch envelopes
export const OSCILLATOR_ADSR_ATTACK  = "a";
export const OSCILLATOR_ADSR_DECAY   = "d";
export const OSCILLATOR_ADSR_SUSTAIN = "s";
export const OSCILLATOR_ADSR_RELEASE = "r";
export const OSCILLATOR_DETUNE       = "d";
export const OSCILLATOR_FINESHIFT    = "f";
export const OSCILLATOR_OCTAVE_SHIFT = "o";
export const OSCILLATOR_VOLUME       = "v";
export const OSCILLATOR_WAVEFORM     = "w";
export const OSCILLATOR_SAMPLE       = "ws";
export const OSCILLATOR_TABLE        = "t";

/**
 * serializes a list of instruments into an .XTK file
 *
 * @param {Object} xtk destination XTK file to serialize into
 * @param {Array<Instrument>} instruments
 */
export const serialize = ( xtk: any, instruments: Instrument[] ): void => {
    const xtkInstruments: any[] = xtk[ INSTRUMENTS ] = new Array( instruments.length );
    const xtkWaveforms: any = xtk[ WAVE_TABLES ] = {};

    let xtkInstrument: any, xtkDelay: any, xtkFilter: any, xtkEq: any, xtkOD: any,
        xtkOscillator: any, xtkADSR: any, xtkPitchADSR: any;

    instruments.forEach(( instrument: Instrument, index: number ): void => {

        xtkInstrument = xtkInstruments[ index ] = {};

        // these modules were only added in a later factory version
        // assert they exist by calling these functions

        InstrumentFactory.createOverdrive( instrument );
        InstrumentFactory.createEQ( instrument );

        const delay  = instrument.delay;
        const filter = instrument.filter;
        const od     = instrument.overdrive;
        const eq     = instrument.eq;

        xtkInstrument[ INSTRUMENT_INDEX ]       = instrument.index;
        xtkInstrument[ INSTRUMENT_NAME ]        = instrument.name;
        xtkInstrument[ INSTRUMENT_PRESET_NAME ] = instrument.presetName;
        xtkInstrument[ INSTRUMENT_VOLUME ]      = instrument.volume;
        xtkInstrument[ INSTRUMENT_PANNING ]     = instrument.panning;
        xtkInstrument[ INSTRUMENT_MUTED ]       = instrument.muted;
        xtkInstrument[ INSTRUMENT_SOLOD ]       = instrument.solo;

        xtkDelay  = xtkInstrument[ INSTRUMENT_DELAY ]  = {};
        xtkFilter = xtkInstrument[ INSTRUMENT_FILTER ] = {};
        xtkEq     = xtkInstrument[ INSTRUMENT_EQ ]     = {};
        xtkOD     = xtkInstrument[ INSTRUMENT_OD ]     = {};

        xtkDelay[ INSTRUMENT_DELAY_ENABLED  ] = delay.enabled;
        xtkDelay[ INSTRUMENT_DELAY_CUTOFF   ] = delay.cutoff;
        xtkDelay[ INSTRUMENT_DELAY_FEEDBACK ] = delay.feedback;
        xtkDelay[ INSTRUMENT_DELAY_DRY      ] = delay.dry;
        xtkDelay[ INSTRUMENT_DELAY_OFFSET   ] = delay.offset;
        xtkDelay[ INSTRUMENT_DELAY_TIME     ] = delay.time;
        xtkDelay[ INSTRUMENT_DELAY_TYPE     ] = delay.type;
        xtkDelay[ INSTRUMENT_DELAY_SYNC     ] = delay.sync;

        xtkFilter[ INSTRUMENT_FILTER_ENABLED   ] = filter.enabled;
        xtkFilter[ INSTRUMENT_FILTER_DEPTH     ] = filter.depth;
        xtkFilter[ INSTRUMENT_FILTER_FREQUENCY ] = filter.frequency;
        xtkFilter[ INSTRUMENT_FILTER_LFO_TYPE  ] = filter.lfoType;
        xtkFilter[ INSTRUMENT_FILTER_Q         ] = filter.q;
        xtkFilter[ INSTRUMENT_FILTER_SPEED     ] = filter.speed;
        xtkFilter[ INSTRUMENT_FILTER_TYPE      ] = filter.type;

        xtkEq[ INSTRUMENT_EQ_ENABLED ] = eq.enabled;
        xtkEq[ INSTRUMENT_EQ_LOW ]     = eq.lowGain;
        xtkEq[ INSTRUMENT_EQ_MID ]     = eq.midGain;
        xtkEq[ INSTRUMENT_EQ_HIGH ]    = eq.highGain;

        xtkOD[ INSTRUMENT_OD_ENABLED ] = od.enabled;
        xtkOD[ INSTRUMENT_OD_PREBAND ] = od.preBand;
        xtkOD[ INSTRUMENT_OD_POSTCUT ] = od.postCut;
        xtkOD[ INSTRUMENT_OD_COLOR ]   = od.color;
        xtkOD[ INSTRUMENT_OD_DRIVE ]   = od.drive;

        xtkInstrument[ INSTRUMENT_OSCILLATORS ] = new Array( instrument.oscillators.length );

        instrument.oscillators.forEach(( oscillator: InstrumentOscillator, oIndex: number ): void => {

            xtkOscillator = xtkInstrument[ INSTRUMENT_OSCILLATORS ][ oIndex ] = {};

            xtkOscillator[ OSCILLATOR_ENABLED ]= oscillator.enabled;
            xtkADSR      = xtkOscillator[ OSCILLATOR_ADSR ]  = {};
            xtkPitchADSR = xtkOscillator[ OSCILLATOR_PITCH ] = {};

            // amplitude envelope

            xtkADSR[ OSCILLATOR_ADSR_ATTACK  ] = oscillator.adsr.attack;
            xtkADSR[ OSCILLATOR_ADSR_DECAY   ] = oscillator.adsr.decay;
            xtkADSR[ OSCILLATOR_ADSR_SUSTAIN ] = oscillator.adsr.sustain;
            xtkADSR[ OSCILLATOR_ADSR_RELEASE ] = oscillator.adsr.release;

            // pitch envelope (added in factory version 2, assert there is a pitch envelope for backwards compatibility)

            InstrumentFactory.createPitchEnvelope( oscillator );

            xtkPitchADSR[ OSCILLATOR_PITCH_RANGE ]  = oscillator.pitch.range;
            xtkPitchADSR[ OSCILLATOR_ADSR_ATTACK  ] = oscillator.pitch.attack;
            xtkPitchADSR[ OSCILLATOR_ADSR_DECAY   ] = oscillator.pitch.decay;
            xtkPitchADSR[ OSCILLATOR_ADSR_SUSTAIN ] = oscillator.pitch.sustain;
            xtkPitchADSR[ OSCILLATOR_ADSR_RELEASE ] = oscillator.pitch.release;

            // oscillator properties

            xtkOscillator[ OSCILLATOR_DETUNE       ] = oscillator.detune;
            xtkOscillator[ OSCILLATOR_FINESHIFT    ] = oscillator.fineShift;
            xtkOscillator[ OSCILLATOR_OCTAVE_SHIFT ] = oscillator.octaveShift;
            xtkOscillator[ OSCILLATOR_VOLUME       ] = oscillator.volume;
            xtkOscillator[ OSCILLATOR_WAVEFORM     ] = oscillator.waveform;
            xtkOscillator[ OSCILLATOR_SAMPLE       ] = oscillator.sample;
            xtkOscillator[ OSCILLATOR_TABLE        ] = oscillator.table;

            // serialize the non-custom waveform and noise tables into the song
            // for use with Tiny player (and backwards compatibility in case of
            // later changes made to default waveforms)

            const waveform = oscillator.waveform;

            if ( ![ OscillatorTypes.CUSTOM, OscillatorTypes.NOISE ].includes( waveform ) &&
                 !Object.prototype.hasOwnProperty.call( xtkWaveforms, waveform )) {
                // @ts-expect-error implicit any due to indexing
                xtkWaveforms[ waveform ] = WaveTables[ waveform ] || {};
            }
        });
    });
};
