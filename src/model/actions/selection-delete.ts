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
import type { Store } from "vuex";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxState } from "@/store";
import { clonePattern } from "@/utils/pattern-util";

export default function deleteSelection( store: Store<EffluxState> ): IUndoRedoState {
    const song = store.state.song.activeSong;
    const { selection } = store.state;
    const { commit }    = store;

    const activePattern   = store.getters.activePatternIndex;
    const firstChannel    = selection.firstSelectedChannel;
    const lastChannel     = selection.lastSelectedChannel;
    const selectedMinStep = selection.minSelectedStep;
    const selectedMaxStep = selection.maxSelectedStep;

    const originalPattern = clonePattern( song, activePattern );
    let cutPattern: EffluxPattern;
    function act(): void {
        if ( cutPattern ) {
            song.patterns[ activePattern ] = cutPattern;
        } else {
            commit( "deleteSelection", { song, activePattern });
            cutPattern = clonePattern( song, activePattern );
        }
        commit( "clearSelection" );
        commit( "invalidateChannelCache", { song });
    }
    act(); // perform action

    return {
        undo(): void {
            // set the original pattern data back
            song.patterns[ activePattern ] = originalPattern;

            // restore selection model to previous state
            commit( "setMinSelectedStep", selectedMinStep);
            commit( "setMaxSelectedStep", selectedMaxStep);
            commit( "setSelectionChannelRange", { firstChannel, lastChannel });
            commit( "invalidateChannelCache", { song });
       },
       redo: act
    };
}