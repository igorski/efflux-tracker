/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2017 - http://www.igorski.nl
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
"use strict";

const Config = require( "../config/Config" );

module.exports =
{
    /**
     * retrieve the localized content for given key
     *
     * @public
     * @param {string} aCopyKey
     * @param {string|number=} aReplacement optional string/number to replace
     *        key "{0}" that optionally exists in the retrieved copy
     * @return {string}
     */
    get( aCopyKey, aReplacement )
    {
        const out = EN[ aCopyKey ] || "_i18n" + aCopyKey;
        return out.replace( "{0}", aReplacement || "" );
    }
};

// TODO? currently English only

const EN =
{
    SONG_LOADED_TITLE       : `Song loaded`,
    SONG_LOADED             : `Loaded song '{0}'`,
    SONG_SAVED              : `Song '{0}' saved`,
    SONG_DELETE_CONFIRM     : `Are you sure you want to delete song '{0}' ? This operation cannot be undone.`,
    WARNING_SONG_RESET      : `Are you sure you want to reset, you will lose all changes and undo history`,
    WARNING_UNLOAD          : `Are you sure you want to leave this page ? All unsaved changes will be lost.`,
    ERROR_TITLE             : `Error`,
    CONFIRM_TITLE           : `Confirm`,
    BUTTON_OK               : `Yes`,
    BUTTON_CANCEL           : `No`,
    BUTTON_FS_ACTIVATE      : `Maximize`,
    BUTTON_FS_CANCEL        : `Exit fullscreen`,
    ERROR_SONG_IMPORT       : `Could not import song, file was possibly not a valid ${Config.SONG_FILE_EXTENSION} ` +
                              `file, or made by an incompatible version of Efflux`,
    ERROR_FILE_LOAD         : `Unknown error occurred while importing file, please try again, if the problems persists, drop us a line.`,
    ERROR_EMPTY_SONG        : `Song has no pattern content!`,
    ERROR_NO_META           : `Song has no title or author name, take pride in your work!`,
    ERROR_MAX_PATTERNS      : `Cannot exceed the allowed maximum of {0} patterns`,
    ERROR_NO_SONGS          : `There are currently no songs available to load. Why not create one?`,
    ERROR_NO_INS_NAME       : `Please enter a name for the instrument preset`,
    ERROR_INSTRUMENT_IMPORT : `Could not import instruments, file was possible not a valid ` +
                              `${Config.INSTRUMENT_FILE_EXTENSION} file, or made by an incompatible version of Efflux`,
    ERROR_PARAM_GLIDE       : `Could not automate module parameter glide. Define the start and end value for a
                               specific module parameter transition within your pattern, without defining other
                               module parameters in between.`,
    SUCCESS_TITLE           : `Operation completed`,
    MIDI_ENABLED            : `Listening to MIDI messages coming from {0}`,
    MIDI_CONNECTED          : `MIDI Connection established successfully`,
    MIDI_FAILURE            : `MIDI Unavailable, Efflux could not connect to MIDI device(s)`,
    RECORDING_ENABLED       : `Recording of output enabled. When the sequencer stops, the recording will be saved ` +
                              `onto to your device`,
    RECORDING_SAVED         : `Recording saved to your download folder`,
    SONG_EXPORTED           : `Song '{0}' exported to your download folder`,
    INSTRUMENTS_EXPORTED    : `Instrument presets exported to your download folder`,
    INSTRUMENTS_IMPORTED    : `{0} instrument presets have been imported`,
    INSTRUMENT_SAVED        : `Instrument '{0}' saved`,

    INPUT_PRESET            : `--- new preset ---`
};
