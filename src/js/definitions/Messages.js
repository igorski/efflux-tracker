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
    SET_CUSTOM_WAVEFORM       : 5,  // payload is Array [ instrument index, oscillator index, waveform table (Array.<number>) ]

    // song messages

    LOAD_SONG                 : 6,  // payload consists of the Song that has been loaded
    SONG_LOADED               : 7,  // payload consists of the Song that has been loaded
    REFRESH_SONG              : 8,
    PATTERN_SWITCH            : 9,  // payload consists of number describing new pattern index
    PATTERN_AMOUNT_UPDATED    : 10,

    // sequencer messages

    PLAYBACK_STOPPED          : 11,
    RECORDING_COMPLETE        : 12,
    TEMPO_UPDATED             : 13, // payload is Array [ old tempo, new tempo ]

    // editor messages

    ADJUST_OSCILLATOR_TUNING  : 14, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_VOLUME  : 15, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    CHANGE_WAVEFORM           : 16  // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
};
