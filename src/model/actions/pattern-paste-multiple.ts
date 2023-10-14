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
import type { EffluxAudioEvent } from "@/model/types/audio-event";
import type { EffluxChannel } from "@/model/types/channel";
import type { EffluxPattern } from "@/model/types/pattern";
import { clone } from "@/utils/object-util";

export default function({ store, patterns, insertIndex } :
    { store: ActionContext<any, any>, patterns: EffluxPattern[], insertIndex: number }): IUndoRedoState {
    const { getters, commit, dispatch, rootState } = store;
    const songPatterns = getters.activeSong.patterns;

    if ( insertIndex === -1 ) {
         // if no index was specified, insert after current position
        insertIndex = store.getters.activePatternIndex;
    }

    // splice the pattern list at the insertion point, head will contain
    // the front of the list, tail the end of the list, and inserted will contain the cloned content

    const patternsHead = clone( songPatterns );
    const patternsTail = patternsHead.splice( insertIndex );

    function linkLists() {
        // update event offsets to match insert position
        const activeSongPatterns = getters.activeSong.patterns;
        for ( let patternIndex = insertIndex, l = activeSongPatterns.length; patternIndex < l; ++patternIndex ) {
            activeSongPatterns[ patternIndex ].channels.forEach(( channel: EffluxChannel ) => {
                channel.forEach(( event: EffluxAudioEvent ) => {
                    if ( event?.seq ) {
                        const eventStart  = event.seq.startMeasure;
                        const eventEnd    = event.seq.endMeasure;
                        const eventLength = isNaN( eventEnd ) ? 1 : eventEnd - eventStart;

                        event.seq.startMeasure = patternIndex;
                        event.seq.endMeasure   = event.seq.startMeasure + eventLength;
                    }
                });
            });
        }
        commit( "createLinkedList", getters.activeSong );
    }

    function act(): void {
        commit( "replacePatterns", clone( patternsHead.concat( patterns, patternsTail )));
        linkLists();
    }
    act(); // perform action

    return {
        undo(): void {
            commit( "replacePatterns", patternsHead.concat( patternsTail ));
            if ( getters.activeSong.order.length <= store.getters.activeOrderIndex ) {
                dispatch( "gotoPattern", getters.activeSong.order.length - 1 );
            }
            linkLists();
        },
        redo: act
    };
}