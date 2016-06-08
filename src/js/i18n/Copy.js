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
    /**
     * retrieve the localized content for given key
     *
     * @public
     * @param {string} aCopyKey
     * @param {string=} aReplacement optional string to replace
     *        key "{0}" that optionally exists in the retrieved copy
     * @return {string}
     */
    get : function( aCopyKey, aReplacement )
    {
        var out = EN[ aCopyKey ] || "_i18n" + aCopyKey;
        return out.replace( "{0}", aReplacement || "" );
    }
};

// TODO? currently English only

var EN =
{
    SONG_LOADED_TITLE  : "Song loaded",
    SONG_LOADED        : "Loaded song '{0}'",
    SONG_SAVED         : "Song '{0}' saved",
    WARNING_SONG_RESET : "Are you sure you want to reset, you will lose all changes and undo history",
    WARNING_UNLOAD     : "Are you sure you want to leave this page ? All unsaved changes will be lost.",
    ERROR_TITLE        : "Error",
    ERROR_EMPTY_SONG   : "Song has no pattern content!",
    ERROR_NO_META      : "Song has no title or author name, take pride in your work!",
    ERROR_MAX_PATTERNS : "Cannot exceed the allowed maximum of {0} patterns",
    ERROR_NO_SONGS     : "There are currently no songs available to load. Why not create one?",
    SUCCESS_TITLE      : "Operation completed",
    MIDI_ENABLED       : "Listening to MIDI messages coming from {0}",
    MIDI_CONNECTED     : "MIDI Connection established successfully",
    MIDI_FAILURE       : "MIDI Unavailable, Efflux could not connect to MIDI device(s)",
    RECORDING_ENABLED  : "Recording of output enabled. When the sequencer stops, the recording will be saved " +
                         "onto to your device"
};
