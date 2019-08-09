/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2019 - https://www.igorski.nl
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
import { MIDINotes, zMIDIEvent } from 'zmidi';
import InstrumentUtil from '../utils/instrument-util';

let store, state;
let noteValue, pitch, instrumentId, instrument;

export default {
    init(storeReference) {
        store = storeReference;
        state = storeReference.state;
    },

    /**
     * MIDI message handler (received via zmidi library)
     * this method is bound to the store state
     *
     * @param {zMIDIEvent} aEvent
     */
    handleMIDIMessage( aEvent ) {
        noteValue = aEvent.valuel // we only deal with note on/off so these always reflect a NOTE
        pitch     = MIDINotes.getPitchByNoteNumber(noteValue);

        switch ( aEvent.type )
        {
            case zMIDIEvent.NOTE_ON:
                instrumentId = state.editor.selectedInstrument;
                instrument   = state.song.activeSong.instruments[ instrumentId ];
                InstrumentUtil.noteOn( pitch, instrument, state.sequencer.recording, store );
                break;

            case zMIDIEvent.NOTE_OFF:
                InstrumentUtil.noteOff( pitch, store );
                break;
        }
    }
};
