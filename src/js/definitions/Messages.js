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
    OPEN_NOTE_ENTRY_PANEL     : 10, // payload is callback Function to be executed on panel close
    OPEN_MODULE_PARAM_PANEL   : 11, // payload is callback Function to be executed on panel close

    // song messages

    LOAD_SONG                 : 12,  // payload consists of the Song that has been loaded
    SONG_LOADED               : 13,  // payload consists of the Song that has been loaded
    REFRESH_SONG              : 14,
    REFRESH_PATTERN_VIEW      : 15,
    PATTERN_SWITCH            : 16,  // payload consists of number describing new pattern index
    PATTERN_AMOUNT_UPDATED    : 17,
    PATTERN_STEPS_UPDATED     : 18,  // payload consists of number describing new pattern length

    // sequencer messages

    TOGGLE_SEQUENCER_PLAYSTATE : 19,
    PLAYBACK_STARTED           : 20,
    PLAYBACK_STOPPED           : 21,
    SET_SEQUENCER_POSITION     : 22, // payload is number describing new measure position
    RECORDING_COMPLETE         : 23,
    TEMPO_UPDATED              : 24, // payload is Array [ old tempo, new tempo ]
    STEP_POSITION_REACHED      : 25, // payload is Array [ current step position, total step positions (per measure) ]

    // editor messages

    ADJUST_OSCILLATOR_TUNING   : 26, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_VOLUME   : 27, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_WAVEFORM : 28, // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_INSTRUMENT_VOLUME   : 29, // payload is Array [ instrument index, new volume ]
    UPDATE_FILTER_SETTINGS     : 30, // payload is Array [ instrument index, filter properties Object ]
    UPDATE_DELAY_SETTINGS      : 31, // payload is Array [ instrument index, delay properties Object ]
    EDIT_NOTE_AT_POSITION      : 32,
    ADD_EVENT_AT_POSITION      : 33, // payload is AUDIO_EVENT, will be appended at current seq. position (PTLController)
    ADD_OFF_AT_POSITION        : 34,
    REMOVE_NOTE_AT_POSITION    : 35,

    // MIDI messages

    MIDI_CONNECT_TO_INTERFACE   : 36,
    MIDI_ADD_LISTENER_TO_DEVICE : 37, // payload is device number (is MIDIInput list number)
    MIDI_RECEIVED_INPUT_DEVICES : 39, // payload is Array.<MIDIInput>
    MIDI_DEVICE_CONNECTED       : 40  // payload is device number (is MIDIInput list number)
};
