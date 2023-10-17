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
import PatternFactory from "@/model/factories/pattern-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxState } from "@/store";
import { clonePattern } from "@/utils/pattern-util";

export default function({ store, patternCopy }: { store: Store<EffluxState>, patternCopy: EffluxPattern }): IUndoRedoState {
    const song         = store.state.song.activeSong,
          patternIndex = store.getters.activePatternIndex;

    const { getters, commit } = store;

    const targetPattern = clonePattern( song, patternIndex );
    const pastedPattern = PatternFactory.mergePatterns( targetPattern, patternCopy );

    function act(): void {
        commit( "replacePattern", { patternIndex, pattern: pastedPattern });
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePattern", { patternIndex, pattern: targetPattern });
        },
        redo: act
    };
}