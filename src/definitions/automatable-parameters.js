/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2020 - https://www.igorski.nl
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
export const DELAY_ENABLED  = 'delayEnabled';
export const DELAY_FEEDBACK = 'delayFeedback';
export const DELAY_CUTOFF   = 'delayCutoff';
export const DELAY_TIME     = 'delayTime';
export const DELAY_OFFSET   = 'delayOffset';

export const EXTERNAL_EVENT = 'EE';

export const FILTER_ENABLED     = 'filterEnabled';
export const FILTER_FREQ        = 'filterFreq';
export const FILTER_Q           = 'filterQ';
export const FILTER_LFO_ENABLED = 'filterLFOEnabled';
export const FILTER_LFO_SPEED   = 'filterLFOSpeed';
export const FILTER_LFO_DEPTH   = 'filterLFODepth';

export const PAN_LEFT   = 'panLeft';
export const PAN_RIGHT  = 'panRight';
export const PITCH_UP   = 'pitchUp';
export const PITCH_DOWN = 'pitchDown';

export const VOLUME = 'volume';

// here we have parameters grouped by their first letter. This is used by the keyboard
// handlers to map single or double characters quickly to the appropriate parameter

export const D_MODULES = [ DELAY_ENABLED, DELAY_FEEDBACK, DELAY_CUTOFF, DELAY_TIME, DELAY_OFFSET ];
export const E_MODULES = [ EXTERNAL_EVENT ];
export const F_MODULES = [
    FILTER_ENABLED, FILTER_FREQ, FILTER_Q, FILTER_LFO_ENABLED, FILTER_LFO_SPEED, FILTER_LFO_DEPTH
];
export const P_MODULES = [ PAN_LEFT, PAN_RIGHT, PITCH_UP, PITCH_DOWN ];
export const V_MODULES = [ VOLUME ];
