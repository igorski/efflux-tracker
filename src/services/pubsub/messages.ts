/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2019-2023 - https://www.igorski.nl
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
export default
{
    // NOTE : these string values should remain unchanged
    // as they are used to expose an API for external implementations

    // 1. subscriptions

    AUDIO_CONTEXT_READY   : "S:AC",
    LOAD_SONG             : "S:SL", // expects song Object as payload
    VALIDATE_AND_GET_SONG : "S:VG", // expect Function handler as payload, function will be invoked with song Object
    SHOW_ERROR            : "S:SE", // expect String message
    SET_LOADING_STATE     : "S:LS", // expects String key to identify the operation which started loading
    UNSET_LOADING_STATE   : "U:LS", // expects String key to identify the operation which finished loading
    SET_BLIND_STATE       : "S:SB", // expects boolean indicating whether obscuring blind should be displayed
    CLOSE_OVERLAY         : "S:CO",

    // 2. broadcasts

    EFFLUX_READY             : "B:ER",
    SONG_LOADED              : "B:SL",
    SONG_SAVED               : "B:SS",
    SONG_IMPORTED            : "B:SI",
    SONG_EXPORTED            : "B:SE",
    INSTRUMENT_EDITOR_OPENED : "B:IE",
    MIDI_CONNECTED           : "B:MC",
    TRACKER_SESSION_CREATED  : "B:TS",
    JAM_SESSION_CREATED      : "B:JS",
};
