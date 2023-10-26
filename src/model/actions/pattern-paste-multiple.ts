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
import type { ActionContext } from "vuex";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";

// @todo (?) this is only supported when useOrders is false (@see settings-module)
export default function( store: ActionContext<any, any>, patterns: EffluxPattern[], insertIndex?: number ): IUndoRedoState {
    const { getters, commit } = store;
    const { activeSong, activePatternIndex } = getters;

    if ( insertIndex === undefined ) {
         // if no index was specified, insert after currently active sequencer position
        insertIndex = activePatternIndex;
    }

    const orgOrder = [ ...activeSong.order ];
    const orgPatternLength = activeSong.patterns.length;

    // splice the pattern list at the insertion point, head will contain
    // the front of the list, tail the end of the list, and inserted will contain the cloned content

    const patternsHead = activeSong.patterns.slice( 0, insertIndex );
    const patternsTail = activeSong.patterns.slice( insertIndex );

    function act(): void {
        commit( "replacePatterns", patternsHead.concat( patterns, patternsTail ));
        // keep order list in sync with pattern list
        const newOrder: EffluxPatternOrder = [ ...orgOrder ];
        for ( let i = orgPatternLength; i < activeSong.patterns.length; ++i ) {
            newOrder.push( i );
        }
        commit( "replacePatternOrder", newOrder );
        commit( "invalidateChannelCache", { song: activeSong });
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", patternsHead.concat( patternsTail ));
            commit( "replacePatternOrder", orgOrder );
            commit( "invalidateChannelCache", { song: activeSong });

            if ( activeSong.order.length <= getters.activeOrderIndex ) {
                commit( "gotoPattern", { orderIndex: activeSong.order.length - 1, song: activeSong });
            }
        },
        redo: act
    };
}
