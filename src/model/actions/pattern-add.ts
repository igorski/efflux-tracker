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
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import PatternUtil from "@/utils/pattern-util";
import PatternOrderUtil from "@/utils/pattern-order-util";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import type { EffluxState } from "@/store";

export default function({ store, patternIndex }: { store: Store<EffluxState>, patternIndex?: number }): IUndoRedoState {
    const song          = store.state.song.activeSong,
          orderIndex    = store.state.sequencer.activeOrderIndex,
          existingPatternIndex = store.getters.activePatternIndex,
          amountOfSteps = store.getters.amountOfSteps,
          useOrders     = store.getters.useOrders;

    if ( typeof patternIndex !== "number" ) {
        patternIndex = existingPatternIndex + 1;
    }

    const existingOrder = [ ...song.order ];
    let newOrder: EffluxPatternOrder = existingOrder.map( index => {
        // all remaining patterns have shifted up by one
        return index > existingPatternIndex! ? index + 1 : index;
    });
    let targetOrderIndex = existingPatternIndex;
 
    if ( useOrders ) {
        newOrder.push( patternIndex );
        targetOrderIndex = newOrder[ newOrder.length - 1 ];
    } else {
        newOrder = PatternOrderUtil.addPatternAtIndex( newOrder, patternIndex, patternIndex );
    }
    const { commit } = store;

    // note we don't cache song.patterns but always reference it from the song as the
    // patterns list is effectively replaced by below actions

    function act(): void {
        const pattern = PatternFactory.create( amountOfSteps );
        commit( "replacePatterns", PatternUtil.addPatternAtIndex( song.patterns, patternIndex!, amountOfSteps, pattern ));
        commit( "replacePatternOrder", newOrder );
        commit( "setActiveOrderIndex", targetOrderIndex );
        commit( "setActivePatternIndex", patternIndex );
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", PatternUtil.removePatternAtIndex( song.patterns, patternIndex! ));
            commit( "replacePatternOrder", existingOrder );
            commit( "setActiveOrderIndex", orderIndex );
            commit( "setActivePatternIndex", existingPatternIndex );
        },
        redo: act
    };
}