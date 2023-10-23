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
import PatternUtil from "@/utils/pattern-util";
import PatternOrderUtil from "@/utils/pattern-order-util";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import type { EffluxState } from "@/store";
import { clonePattern } from "@/utils/pattern-util";

export default function( store: Store<EffluxState>, patternIndex?: number ): IUndoRedoState {
    const song          = store.state.song.activeSong,
          patterns      = song.patterns,
          amountOfSteps = store.getters.amountOfSteps,
          orderIndex    = store.getters.activeOrderIndex;

    if ( typeof patternIndex !== "number" ) {
        patternIndex = store.getters.activePatternIndex;
    }
    const targetIndex = patternIndex === ( song.patterns.length - 1 ) ? patternIndex - 1 : patternIndex;

    const { commit } = store;
    const existingPattern = clonePattern( song, patternIndex! );
    const existingOrder = [ ...song.order ];
    const newOrder = PatternOrderUtil.removeAllPatternInstances( existingOrder, patternIndex ).map( index => {
        // all remaining patterns have shifted down by one
        return ( index > patternIndex! ) ? index - 1 : index;
    });

    function act(): void {
        commit( "replacePatterns", PatternUtil.removePatternAtIndex( patterns, patternIndex ));
        commit( "replacePatternOrder", newOrder );
        commit( "setActivePatternIndex", targetIndex );
        if ( orderIndex >= song.order.length ) {
            commit( "setActiveOrderIndex", newOrder.length - 1 );
        }
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", PatternUtil.addPatternAtIndex( patterns, patternIndex, amountOfSteps, existingPattern ));
            commit( "replacePatternOrder", existingOrder );
            commit( "setActivePatternIndex", patternIndex );
            if ( !store.getters.isPlaying ) {
                commit( "setActiveOrderIndex", orderIndex );
            }
        },
        redo: act
    };
}