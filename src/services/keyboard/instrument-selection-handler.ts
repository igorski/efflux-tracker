/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2017-2023 - https://www.igorski.nl
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
import type { Store } from "vuex";
import Config from "@/config";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxState } from "@/store";

let store: Store<EffluxState>;
let state: EffluxState;

// keyCode for the 1 key
const ONE = 49;
let MAX_ACCEPTED_KEYCODE: number;

export default {
    init( storeReference: Store<EffluxState> ): void {
        store = storeReference;
        ({ state } = store );

        // this will not really work if we allow more than 10 instruments :p
        MAX_ACCEPTED_KEYCODE = ONE + ( Config.INSTRUMENT_AMOUNT - 1 );
    },

    setInstrument( keyCode: number ): void {
        if ( keyCode >= ONE && keyCode <= MAX_ACCEPTED_KEYCODE ) {
            const event = state.song.activeSong
                            .patterns[ store.getters.activePatternIndex ]
                            .channels[ state.editor.selectedInstrument ][ state.editor.selectedStep ] as EffluxAudioEvent;

            if ( !event ) {
                return;
            }
            // note we subtract 1 as we store the instrument by index in the model, but
            // visualize it starting from 1 as humans love that.
            const newInstrumentIndex = keyCode - ONE;
            const oldInstrumentIndex = event.instrument;

            function act(): void {
                event.instrument = newInstrumentIndex;
            }
            act();

            store.commit( "saveState", {
                undo: () => {
                    event.instrument = oldInstrumentIndex;
                },
                redo: act
            });
        }
    }
};
