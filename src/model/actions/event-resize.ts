/**
 * The MIT License (MIT)
 *
 * Igor Zinken 2023 - https://www.igorski.nl
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
import Vue from "vue";
import type { Store } from "vuex";
import EventFactory from "@/model/factories/event-factory";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import { ACTION_NOTE_OFF } from "@/model/types/audio-event";
import type { EffluxState } from "@/store";

export default function( store: Store<EffluxState>, patternIndex: number, instrumentIndex: number, step: number, newLength: number ): IUndoRedoState {
    const { patterns } = store.getters.activeSong;
    
    const lastIndex  = step + newLength;
    const tail = patterns[ patternIndex ].channels[ instrumentIndex ].slice( step + 1, lastIndex );
    let hadLastEvent = false;

    function act(): void {
        const channel = patterns[ patternIndex ].channels[ instrumentIndex ];

        for ( let i = step + 1, l = lastIndex; i < l; ++i ) {
            Vue.set( channel, i, 0 );
        }
        hadLastEvent = !!channel[ lastIndex ];
        if ( !hadLastEvent ) {
            Vue.set( channel, lastIndex, EventFactory.create( instrumentIndex, "", 0, ACTION_NOTE_OFF ));
        }
    }
    act();

    return {
        undo: (): void => {
            const channel = patterns[ patternIndex ].channels[ instrumentIndex ];

            for ( let i = 0, l = tail.length; i < l; ++i ) {
                Vue.set( channel, ( step + 1 + i ), tail[ i ] );
            }

            if ( !hadLastEvent ) {
                Vue.set( channel, lastIndex, 0 );
            }
        },
        redo: act,
    };
}
