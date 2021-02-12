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
import {
    DELAY_ENABLED,
    DELAY_FEEDBACK,
    DELAY_CUTOFF,
    DELAY_TIME,
    DELAY_OFFSET,
    EQ_ENABLED,
    EQ_LOW,
    EQ_MID,
    EQ_HIGH,
    FILTER_ENABLED,
    FILTER_FREQ,
    FILTER_Q,
    FILTER_LFO_ENABLED,
    FILTER_LFO_SPEED,
    FILTER_LFO_DEPTH,
    OD_ENABLED,
    OD_DRIVE,
    OD_PRE_BAND,
    OD_COLOR,
    OD_POST_CUT
} from "./param-ids";

// all parameter ids should be available for automation

export * from "./param-ids";

// though we also allow automation of parameters beyond the instrument modeules:

export const PAN_LEFT   = "panLeft";
export const PAN_RIGHT  = "panRight";
export const PITCH_UP   = "pitchUp";
export const PITCH_DOWN = "pitchDown";
export const VOLUME     = "volume";

// EXTERNAL_EVENT is used to broadcast a value from the sequencer
// to any listening applications (see Tiny player)

export const EXTERNAL_EVENT = "XE";

// here we have the parameters grouped by their first letter. This is used by the keyboard
// handlers to map single or double characters quickly to the appropriate parameter

export const D_MODULES = [ DELAY_ENABLED, DELAY_FEEDBACK, DELAY_CUTOFF, DELAY_TIME, DELAY_OFFSET ];
export const E_MODULES = [ EQ_ENABLED, EQ_LOW, EQ_MID, EQ_HIGH ];
export const F_MODULES = [
    FILTER_ENABLED, FILTER_FREQ, FILTER_Q, FILTER_LFO_ENABLED, FILTER_LFO_SPEED, FILTER_LFO_DEPTH
];
export const O_MODULES = [ OD_ENABLED, OD_DRIVE, OD_PRE_BAND, OD_COLOR, OD_POST_CUT ];
export const P_MODULES = [ PAN_LEFT, PAN_RIGHT, PITCH_UP, PITCH_DOWN ];
export const V_MODULES = [ VOLUME ];
export const X_MODULES = [ EXTERNAL_EVENT ];
