/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2016-2023 - https://www.igorski.nl
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
import { type Store } from "vuex";
import { type IUndoRedoState } from "@/model/factories/history-state-factory";
import { ACTION_NOTE_ON, type EffluxAudioEvent} from "@/model/types/audio-event";
import { type EffluxState } from "@/store";
import { clone } from "@/utils/object-util";
import { Transpose } from "@/services/audio/pitch";

export default function transpose(
    store: Store<EffluxState>, semitones: number,
    firstPattern: number, lastPattern: number,
    firstChannel: number, lastChannel: number
): IUndoRedoState {
    const { state, commit } = store;
    const { activeSong } = state.song;
    const songPatterns = activeSong.patterns;

    const transposedPatterns = clone( songPatterns );

    let p = firstPattern;
    do {
        const { channels } = transposedPatterns[ p ];
        let c = firstChannel;
        do {
            channels[ c ].forEach(( event: EffluxAudioEvent ) => {
                if ( !event || event.action !== ACTION_NOTE_ON ) {
                    return;
                }
                const { note, octave } = Transpose( event.note, event.octave, semitones );
                event.note = note;
                event.octave = octave;
            })
            ++c;
        } while ( c <= lastChannel );
        ++p;
    } while ( p <= lastPattern );

    function act(): void {
        commit( "replacePatterns", transposedPatterns );
        commit( "invalidateChannelCache", { song: activeSong });
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", songPatterns );
            commit( "invalidateChannelCache", { song: activeSong });
        },
        redo: act
    };
}
