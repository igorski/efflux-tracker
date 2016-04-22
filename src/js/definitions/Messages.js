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

    SHOW_ERROR                : 0, // payload is a String message that will be displayed in a popup (NotificationController)
    SHOW_FEEDBACK             : 1, // payload is a String message that will be displayed in a popup (NotificationController)
    WINDOW_SCROLLED           : 2,
    WINDOW_RESIZED            : 3,

    // UI messages

    DISPLAY_HELP              : 4,
    CLOSE_OVERLAYS            : 5,
    TOGGLE_INSTRUMENT_EDITOR  : 6,  // payload consists of number describing selected instrument index
    SET_CUSTOM_WAVEFORM       : 7,  // payload is Array [ instrument index, oscillator index, waveform table (Array.<number>) ]
    OPEN_SONG_LIST            : 8,
    OPEN_SETTINGS_PANEL       : 9,

    // song messages

    LOAD_SONG                 : 10,  // payload consists of the Song that has been loaded
    SONG_LOADED               : 11,  // payload consists of the Song that has been loaded
    REFRESH_SONG              : 12,
    PATTERN_SWITCH            : 13,  // payload consists of number describing new pattern index
    PATTERN_AMOUNT_UPDATED    : 14,
    PATTERN_STEPS_UPDATED     : 15, // payload consists of number describing new pattern length

    // sequencer messages

    TOGGLE_SEQUENCER_PLAYSTATE : 16,
    PLAYBACK_STARTED           : 17,
    PLAYBACK_STOPPED           : 18,
    RECORDING_COMPLETE         : 19,
    TEMPO_UPDATED              : 20, // payload is Array [ old tempo, new tempo ]
    STEP_POSITION_REACHED      : 21, // payload is Array [ current step position, total step positions (per measure) ]

    // editor messages

    ADJUST_OSCILLATOR_TUNING   : 22, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_VOLUME   : 23, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_WAVEFORM : 24, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_INSTRUMENT_VOLUME   : 25, // payload is Array [ instrument index, new volume ]
    UPDATE_FILTER_SETTINGS     : 26, // payload is Array [ instrument index, filter properties Object ]
    ADD_NOTE_AT_POSITION       : 27,
    ADD_OFF_AT_POSITION        : 28,
    REMOVE_NOTE_AT_POSITION    : 29,

    // MIDI messages

    MIDI_CONNECT_TO_INTERFACE   : 30,
    MIDI_ADD_LISTENER_TO_DEVICE : 31, // payload is device number (is MIDIInput list number)
    MIDI_RECEIVED_INPUT_DEVICES : 32  // payload is Array.<MIDIInput>
};
