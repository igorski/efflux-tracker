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
    REFRESH_PATTERN_VIEW      : 13,
    PATTERN_SWITCH            : 14,  // payload consists of number describing new pattern index
    PATTERN_AMOUNT_UPDATED    : 15,
    PATTERN_STEPS_UPDATED     : 16, // payload consists of number describing new pattern length

    // sequencer messages

    TOGGLE_SEQUENCER_PLAYSTATE : 17,
    PLAYBACK_STARTED           : 18,
    PLAYBACK_STOPPED           : 19,
    SET_SEQUENCER_POSITION     : 20, // payload is number describing new measure position
    RECORDING_COMPLETE         : 21,
    TEMPO_UPDATED              : 22, // payload is Array [ old tempo, new tempo ]
    STEP_POSITION_REACHED      : 23, // payload is Array [ current step position, total step positions (per measure) ]

    // editor messages

    ADJUST_OSCILLATOR_TUNING   : 24, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_VOLUME   : 25, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_WAVEFORM : 26, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_INSTRUMENT_VOLUME   : 27, // payload is Array [ instrument index, new volume ]
    UPDATE_FILTER_SETTINGS     : 28, // payload is Array [ instrument index, filter properties Object ]
    UPDATE_DELAY_SETTINGS      : 29, // payload is Array [ instrument index, delay properties Object ]
    EDIT_NOTE_AT_POSITION      : 30,
    ADD_EVENT_AT_POSITION      : 31, // payload is AUDIO_EVENT, will be appended at current seq. position (PTLController)
    ADD_OFF_AT_POSITION        : 32,
    REMOVE_NOTE_AT_POSITION    : 33,

    // MIDI messages

    MIDI_CONNECT_TO_INTERFACE   : 34,
    MIDI_ADD_LISTENER_TO_DEVICE : 35, // payload is device number (is MIDIInput list number)
    MIDI_RECEIVED_INPUT_DEVICES : 36, // payload is Array.<MIDIInput>
    MIDI_DEVICE_CONNECTED       : 37  // payload is device number (is MIDIInput list number)
};
