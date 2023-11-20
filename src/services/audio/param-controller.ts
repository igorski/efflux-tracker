/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the 'Software'), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { Store } from "vuex";
import Config from "@/config";
import * as ParamIds from "@/definitions/param-ids";
import { type InstrumentProp, type OscillatorProp } from "@/model/types/instrument";
import AudioService, { applyModule } from "@/services/audio-service";
import { type OptDataProp } from "@/services/midi-service";
import { type EffluxState } from "@/store";

export const MIDI_ASSIGNABLE = ParamIds;

export const TUNING_PROPERTIES = [
    ParamIds.OSCILLATOR_DETUNE,
    ParamIds.OSCILLATOR_OCT_SHIFT,
    ParamIds.OSCILLATOR_FINE_SHIFT
];

export const getParamRange = ( paramId: string ): { min: number, max: number, step: number } => {
    let min  = 0;
    let max  = 1;
    let step = 0.01;

    switch ( paramId ) {
        default:
            break;
        case ParamIds.PITCH_RANGE:
            min = -24;
            max = 24;
            step = 1;
            break;
        case ParamIds.OSCILLATOR_DETUNE:
            min  = -50;
            max  = 50;
            step = 0.1;
            break;
        case ParamIds.OSCILLATOR_OCT_SHIFT:
            min  = -2;
            max  = 2;
            step = 1;
            break;
        case ParamIds.OSCILLATOR_FINE_SHIFT:
            min  = -7;
            max  = 7;
            step = 1;
            break;
        case ParamIds.DELAY_TIME:
            step = 0.001;
            break;
        case ParamIds.DELAY_CUTOFF:
        case ParamIds.OD_POST_CUT:
        case ParamIds.OD_COLOR:
            max  = Config.MAX_FILTER_FREQ;
            step = 1;
            break;
        case ParamIds.DELAY_OFFSET:
            min = -0.5;
            max = 0.5;
            break;
        case ParamIds.FILTER_FREQ:
            min = 40;
            max = Config.MAX_FILTER_FREQ;
            break;
        case ParamIds.FILTER_Q:
            max  = 40;
            step = 1;
            break;
        case ParamIds.FILTER_LFO_SPEED:
            min = 0.1;
            max = 25;
            break;
        case ParamIds.FILTER_LFO_DEPTH:
            max = 100;
            break;
    }
    return { min, max, step };
};

/* applies a UI or MIDI controller-initiated parameter change onto the model */

export const applyParamChange = ( paramId: string, paramValue: number, instrumentIndex: number,
    store: Store<EffluxState>, optData?: OptDataProp ): void =>
{
    const instrumentRef  = store.getters.activeSong.instruments[ instrumentIndex ]
    let value: any;

    if ( typeof optData === "number" ) {
        // for now optData is only used to get oscillator indices
        const oscillatorIndex = optData as number;
        const [ prop, paramKey ] = getEnvelopePropsByParamId( paramId )!;
        if ( paramKey ) {
            value = { ...instrumentRef.oscillators[ oscillatorIndex ][ prop ], [ paramKey ]: paramValue };
        } else {
            value = paramValue;
            const oscillator = instrumentRef.oscillators[ oscillatorIndex ];

            if ( TUNING_PROPERTIES.includes( prop as OscillatorProp )) {
                AudioService.updateOscillator( "tuning", instrumentIndex, oscillatorIndex, oscillator );
            } else if ( prop === ParamIds.OSCILLATOR_VOLUME ) {
                AudioService.updateOscillator( "volume", instrumentIndex, oscillatorIndex, oscillator  );
            }
        }
        console.info('setting value', value );
        store.commit( "updateOscillator", { instrumentIndex, oscillatorIndex, prop, value });
    } else {
        const [ prop, paramKey ] = getModulePropKeysByParamId( paramId )!;
        value = { ...instrumentRef[ prop ], [ paramKey ]: paramValue };
        store.commit( "updateInstrument", { instrumentIndex, prop, value });
        applyModule( prop, instrumentIndex, value );
    }
};

/* internal methods */

const EQ: InstrumentProp     = "eq";
const FILTER: InstrumentProp = "filter";
const OD: InstrumentProp     = "overdrive";
const DELAY: InstrumentProp  = "delay";

function getModulePropKeysByParamId( paramId: string ): [ InstrumentProp, string ] | undefined {
    switch ( paramId ) {
        default:
        // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
        if ( import.meta.env.MODE !== "production" ) {
            throw new Error( `cannot map unknown param "${paramId}" to an instrument property` );
        }
        break;
        // Delay
        case ParamIds.DELAY_TIME     : return [ DELAY, "time" ];
        case ParamIds.DELAY_FEEDBACK : return [ DELAY, "feedback" ];
        case ParamIds.DELAY_DRY      : return [ DELAY, "dry" ];
        case ParamIds.DELAY_CUTOFF   : return [ DELAY, "cutoff" ];
        case ParamIds.DELAY_OFFSET   : return [ DELAY, "offset" ];
        // EQ
        case ParamIds.EQ_LOW  : return [ EQ, "lowGain" ];
        case ParamIds.EQ_MID  : return [ EQ, "midGain" ];
        case ParamIds.EQ_HIGH : return [ EQ, "highGain" ];
        // Filter
        case ParamIds.FILTER_FREQ      : return [ FILTER, "frequency" ];
        case ParamIds.FILTER_Q         : return [ FILTER, "q" ];
        case ParamIds.FILTER_LFO_SPEED : return [ FILTER, "speed" ];
        case ParamIds.FILTER_LFO_DEPTH : return [ FILTER, "depth" ];
        // Overdrive
        case ParamIds.OD_COLOR    : return [ OD, "color" ];
        case ParamIds.OD_DRIVE    : return [ OD, "drive" ];
        case ParamIds.OD_PRE_BAND : return [ OD, "preBand" ];
        case ParamIds.OD_POST_CUT : return [ OD, "postCut" ];
    }
    return undefined;
}

const ADSR: OscillatorProp  = "adsr";
const PITCH: OscillatorProp = "pitch";

function getEnvelopePropsByParamId( paramId: string ): [ OscillatorProp, string? ] | undefined {
    switch ( paramId ) {
        default:
        // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
        if ( import.meta.env.MODE !== "production" ) {
            throw new Error( `cannot map unknown param "${paramId}" to an instrument property` );
        }
        break;
        // ADSR envelopes
        case ParamIds.ADSR_ATTACK: return [ ADSR, "attack" ];
        case ParamIds.ADSR_DECAY: return [ ADSR, "decay" ];
        case ParamIds.ADSR_SUSTAIN: return [ ADSR, "sustain" ];
        case ParamIds.ADSR_RELEASE: return [ ADSR, "release" ];
        // pitch envelopes
        case ParamIds.PITCH_ATTACK: return [ PITCH, "attack" ];
        case ParamIds.PITCH_DECAY: return [ PITCH, "decay" ];
        case ParamIds.PITCH_SUSTAIN: return [ PITCH, "sustain" ];
        case ParamIds.PITCH_RELEASE: return [ PITCH, "release" ];
        case ParamIds.PITCH_RANGE: return [ PITCH, "range" ];
        // tuning
        case ParamIds.OSCILLATOR_DETUNE: return [ "detune" ];
        case ParamIds.OSCILLATOR_OCT_SHIFT: return [ "octaveShift" ];
        case ParamIds.OSCILLATOR_FINE_SHIFT: return [ "fineShift" ];
        // volume
        case ParamIds.OSCILLATOR_VOLUME: return [ "volume" ];
    }
    return undefined;
}