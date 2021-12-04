/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2021 - https://www.igorski.nl
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
import InstrumentUtil from "@/utils/instrument-util";

let store, state, extHandler;

// High notes:  2 3   5 6 7   9 0
//             Q W E R T Y U I O P
const HIGHER_KEYS = [ 81, 50, 87, 51, 69, 82, 53, 84, 54, 89, 55, 85, 73, 57, 79, 48, 80 ];
const HIGHER_KEY_NAMES = [ "Q", "2", "W", "3", "E", "R", "5", "T", "6", "Y", "7", "U", "I", "9", "O", "0", "P" ];

// Low notes:  S D   G H J   L ;
//            Z X C V B N M , . /
const LOWER_KEYS = [ 90, 83, 88, 68, 67, 86, 71, 66, 72, 78, 74, 77, 188, 76, 190, 186, 191 ];

const KEY_NOTE_LIST = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E" ];

export default {
    init( storeReference ) {
        store = storeReference;
        state = store.state;
    },
    registerHandler( handlerFn ) {
        extHandler = handlerFn;
    },
    unregisterHandler() {
        extHandler = null;
    },
    createNoteOnEvent( keyCode ) {
        const note = getNoteForKey( keyCode );
        if ( note !== null ) {
            const audioEvent = InstrumentUtil.onKeyDown(
                note,
                state.song.activeSong.instruments[ state.editor.selectedInstrument ],
                state.sequencer.recording,
                store
            );
            audioEvent && extHandler?.( "on", audioEvent );
        }
    },
    createNoteOffEvent( keyCode ) {
        const note = getNoteForKey( keyCode );
        if ( note !== null ) {
            const audioEvent = InstrumentUtil.onKeyUp( note, store );
            audioEvent && extHandler?.( "off", audioEvent );
        }
    },
    keyForNote( note, higher = true ) {
        return HIGHER_KEY_NAMES[ KEY_NOTE_LIST[ higher ? "lastIndexOf" : "indexOf" ]( note ) ];
    }
};

/* internal methods */

/**
 * translates a key code to a note
 * if the key code didn't belong to the keys associated with notes, null is returned
 *
 * @param keyCode
 * @return {{ note: string, octave: number }|null}
 */
function getNoteForKey( keyCode )
{
    const higherIndex = HIGHER_KEYS.indexOf( keyCode );
    const lowerIndex  = LOWER_KEYS.indexOf( keyCode );

    let note, octave;

    if ( higherIndex > -1 ) {
        note   = KEY_NOTE_LIST[ higherIndex ];
        octave = state.editor.higherKeyboardOctave + ( higherIndex >= 12 ? 1 : 0 );
    }
    else if ( lowerIndex > -1 ) {
        note   = KEY_NOTE_LIST[ lowerIndex ];
        octave = state.editor.lowerKeyboardOctave + ( lowerIndex >= 12 ? 1 : 0 );
    }
    else {
        return null;
    }
    return { note, octave };
}
