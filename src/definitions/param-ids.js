/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2021 - https://www.igorski.nl
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
import Config from "@/config";
import { applyModule } from "@/services/audio-service";

// NOTE the String names here are in camelCase and must be meaningful
// as they are reflected in the interface (and keyboard entry)

export const DELAY_ENABLED  = "delayEnabled";
export const DELAY_FEEDBACK = "delayFeedback";
export const DELAY_DRY      = "delayDry";
export const DELAY_CUTOFF   = "delayCutoff";
export const DELAY_TIME     = "delayTime";
export const DELAY_OFFSET   = "delayOffset";

export const EQ_ENABLED = "eqEnabled";
export const EQ_LOW     = "eqLow";
export const EQ_MID     = "eqMid";
export const EQ_HIGH    = "eqHigh";

export const FILTER_ENABLED     = "filterEnabled";
export const FILTER_FREQ        = "filterFreq";
export const FILTER_Q           = "filterQ";
export const FILTER_LFO_ENABLED = "filterLFOEnabled";
export const FILTER_LFO_SPEED   = "filterLFOSpeed";
export const FILTER_LFO_DEPTH   = "filterLFODepth";

export const OD_ENABLED  = "odEnabled";
export const OD_DRIVE    = "odDrive";
export const OD_PRE_BAND = "odPreBand";
export const OD_COLOR    = "odColor";
export const OD_POST_CUT = "odPostCut";

export const MIDI_ASSIGNABLE = {
    DELAY_FEEDBACK,
    DELAY_DRY,
    DELAY_CUTOFF,
    DELAY_TIME,
    DELAY_OFFSET,
    EQ_LOW,
    EQ_MID,
    EQ_HIGH,
    FILTER_FREQ,
    FILTER_Q,
    FILTER_LFO_SPEED,
    FILTER_LFO_DEPTH,
    OD_DRIVE,
    OD_PRE_BAND,
    OD_COLOR,
    OD_POST_CUT
};

export const getParamRange = paramId => {
    let min  = 0;
    let max  = 1;
    let step = 0.01;
    switch ( paramId ) {
        default:
            break;
        case DELAY_TIME:
            step = 0.001;
            break;
        case DELAY_CUTOFF:
        case OD_POST_CUT:
        case OD_COLOR:
            max  = Config.MAX_FILTER_FREQ;
            step = 1;
            break;
        case DELAY_OFFSET:
            min = -0.5;
            max = 0.5;
            break;
        case FILTER_FREQ:
            min = 40;
            max = Config.MAX_FILTER_FREQ;
            break;
        case FILTER_Q:
            max  = 40;
            step = 1;
            break;
        case FILTER_LFO_SPEED:
            min = 0.1;
            max = 25;
            break;
        case FILTER_LFO_DEPTH:
            max = 100;
            break;
    }
    return { min, max, step };
};

/* applies a UI-initiated parameter change onto the model */

export const applyParamChange = ( paramId, paramValue, instrumentIndex, storeReference ) => {
    const instrumentRef      = storeReference.getters.activeSong.instruments[ instrumentIndex ];
    const [ prop, paramKey ] = getInstrumentPropKeysByParamId( paramId );
    const value = { ...instrumentRef[ prop ], [ paramKey ]: paramValue };
    storeReference.commit( "updateInstrument", { instrumentIndex, prop, value });
    applyModule( prop, instrumentIndex, value );
};

/* internal methods */

const EQ     = "eq";
const FILTER = "filter";
const OD     = "overdrive";
const DELAY  = "delay";

function getInstrumentPropKeysByParamId( paramId ) {
    switch ( paramId ) {
        default:
            if ( process.env.NODE_ENV === "development" ) {
                throw new Error( `cannot map unknown param "${paramId}" to an instrument property` );
            }
            break;
        // Delay
        case DELAY_TIME     : return [ DELAY, "time" ];
        case DELAY_FEEDBACK : return [ DELAY, "feedback" ];
        case DELAY_DRY      : return [ DELAY, "dry" ];
        case DELAY_CUTOFF   : return [ DELAY, "cutoff" ];
        case DELAY_OFFSET   : return [ DELAY, "offset" ];
        // EQ
        case EQ_LOW  : return [ EQ, "lowGain" ];
        case EQ_MID  : return [ EQ, "midGain" ];
        case EQ_HIGH : return [ EQ, "highGain" ];
        // Filter
        case FILTER_FREQ      : return [ FILTER, "frequency" ];
        case FILTER_Q         : return [ FILTER, "q" ];
        case FILTER_LFO_SPEED : return [ FILTER, "speed" ];
        case FILTER_LFO_DEPTH : return [ FILTER, "depth" ];
        // Overdrive
        case OD_COLOR    : return [ OD, "color" ];
        case OD_DRIVE    : return [ OD, "drive" ];
        case OD_PRE_BAND : return [ OD, "preBand" ];
        case OD_POST_CUT : return [ OD, "postCut" ];
    }
}
