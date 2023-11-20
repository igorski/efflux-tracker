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

import { type OscillatorProp } from "../model/types/instrument";

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

export const ADSR_ATTACK   = "adsrAttack";
export const ADSR_DECAY    = "adsrDecay";
export const ADSR_SUSTAIN  = "adsrSustain";
export const ADSR_RELEASE  = "adsrRelease";

export const PITCH_ATTACK  = "pitchAttack";
export const PITCH_DECAY   = "pitchDecay";
export const PITCH_SUSTAIN = "pitchSustain";
export const PITCH_RELEASE = "pitchRelease";
export const PITCH_RANGE   = "pitchRange";

export const OSCILLATOR_ENABLED: OscillatorProp    = "enabled";
export const OSCILLATOR_DETUNE: OscillatorProp     = "detune";
export const OSCILLATOR_OCT_SHIFT: OscillatorProp  = "octaveShift";
export const OSCILLATOR_FINE_SHIFT: OscillatorProp = "fineShift";
export const OSCILLATOR_VOLUME: OscillatorProp     = "volume";
