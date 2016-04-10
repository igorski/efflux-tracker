/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016 - http://www.igorski.nl
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
module.exports =
{
    // system messages

    SHOW_ERROR                : 0,
    SHOW_FEEDBACK             : 1,

    // UI messages

    DISPLAY_HELP              : 2,
    CLOSE_OVERLAYS            : 3,
    TOGGLE_INSTRUMENT_EDITOR  : 4,  // payload consists of number describing selected instrument index

    // song messages

    LOAD_SONG                 : 5,
    SONG_LOADED               : 6,
    REFRESH_SONG              : 7,
    PATTERN_SWITCH            : 8,  // payload consists of number describing new pattern index
    PATTERN_AMOUNT_UPDATED    : 9,

    // sequencer messages

    PLAYBACK_STOPPED          : 10,
    RECORDING_COMPLETE        : 11,
    TEMPO_UPDATED             : 12  // payload consists of Array.<number> w/ old and new tempo values
};
