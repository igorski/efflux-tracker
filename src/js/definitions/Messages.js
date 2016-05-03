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

    SHOW_ERROR                : "SYSER", // payload is a String message that will be displayed in a popup (NotificationController)
    SHOW_FEEDBACK             : "SYSFB", // payload is a String message that will be displayed in a popup (NotificationController)
    SHOW_LOADER               : "SYSSL",
    HIDE_LOADER               : "SYSHL",
    SHOW_BLIND                : "SYS:0",
    HIDE_BLIND                : "SYS:1",
    WINDOW_SCROLLED           : "SYS:2",
    WINDOW_RESIZED            : "SYS:3",

    // UI messages

    DISPLAY_HELP              : "UI:0",
    CLOSE_OVERLAYS            : "UI:1", // payload consists of optional ViewController (references controller of overlay that should remain unclosed)
    TOGGLE_INSTRUMENT_EDITOR  : "UI:2", // payload consists of number describing selected instrument index
    SET_CUSTOM_WAVEFORM       : "UI:3", // payload is Array [ instrument index, oscillator index, waveform table (Array.<number>) ]
    OPEN_SONG_LIST            : "UI:4",
    OPEN_SETTINGS_PANEL       : "UI:5",
    OPEN_NOTE_ENTRY_PANEL     : "UI:6", // payload is callback Function to be executed on panel close
    OPEN_MODULE_PARAM_PANEL   : "UI:7", // payload is callback Function to be executed on panel close
    HIGHLIGHT_ACTIVE_STEP     : "UI:8", // payload is number indicating currently active highlight

    // song messages

    LOAD_SONG                 : "SNG:0",  // payload consists of the Song that has been loaded
    SONG_LOADED               : "SNG:1",  // payload consists of the Song that has been loaded
    REFRESH_SONG              : "SNG:2",
    REFRESH_PATTERN_VIEW      : "SNG:3",
    PATTERN_SWITCH            : "SNG:4",  // payload consists of number describing new pattern index
    PATTERN_AMOUNT_UPDATED    : "SNG:5",
    PATTERN_STEPS_UPDATED     : "SNG:6",  // payload consists of number describing new pattern length
    VALIDATE_AND_GET_SONG     : "SNGVG",  // payload consists of callback function receiving Song

    // sequencer messages

    TOGGLE_SEQUENCER_PLAYSTATE : "SEQ:0",
    PLAYBACK_STARTED           : "SEQ:1",
    PLAYBACK_STOPPED           : "SEQ:2",
    SET_SEQUENCER_POSITION     : "SEQ:3", // payload is number describing new measure position
    RECORDING_COMPLETE         : "SEQ:4",
    TEMPO_UPDATED              : "SEQ:5", // payload is Array [ old tempo, new tempo ]
    STEP_POSITION_REACHED      : "SEQ:6", // payload is Array [ current step position, total step positions (per measure) ]
    TOGGLE_RECORD_MODE         : "SEQ:7",

    // editor messages

    ADJUST_OSCILLATOR_TUNING   : "ED:0", // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_VOLUME   : "ED:1", // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_OSCILLATOR_WAVEFORM : "ED:2", // payload is Array [ instrument index, oscillator index, INSTRUMENT_OSCILLATOR ]
    ADJUST_INSTRUMENT_VOLUME   : "ED:3", // payload is Array [ instrument index, new volume ]
    UPDATE_FILTER_SETTINGS     : "ED:4", // payload is Array [ instrument index, filter properties Object ]
    UPDATE_DELAY_SETTINGS      : "ED:5", // payload is Array [ instrument index, delay properties Object ]
    EDIT_NOTE_AT_POSITION      : "ED:6",
    ADD_EVENT_AT_POSITION      : "ED:7", // payload is Array [ AUDIO_EVENT, optional data ] (will be appended at current seq. position if no opt data (PTLController)
    ADD_OFF_AT_POSITION        : "ED:8",
    REMOVE_NOTE_AT_POSITION    : "ED:9",

    // MIDI messages

    MIDI_CONNECT_TO_INTERFACE   : "MID:0",
    MIDI_ADD_LISTENER_TO_DEVICE : "MID:1", // payload is device number (is MIDIInput list number)
    MIDI_RECEIVED_INPUT_DEVICES : "MID:2", // payload is Array.<MIDIInput>
    MIDI_DEVICE_CONNECTED       : "MID:3"  // payload is device number (is MIDIInput list number)
};
