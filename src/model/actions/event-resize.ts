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
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import { EffluxSongType } from "@/model/types/song";
import type { EffluxState } from "@/store";
import { clone } from "@/utils/object-util";
import {
    invalidateCache, nonExistentOrAutomationOnly, moveEventToNextSlotIfFree, insertNoteOff
} from "./event-actions";

export default function( store: Store<EffluxState>, patternIndex: number, channelIndex: number, step: number, newLength: number ): IUndoRedoState {
    const song = store.state.song.activeSong;

    if ( song.type !== EffluxSongType.JAM ) {
        // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
        if ( import.meta.env.MODE !== "production" ) {
            console.error( "Event move was created for JAM mode exclusively" );
        }
        return;
    }

    const orgContent = clone( song.patterns[ patternIndex ].channels[ channelIndex ] );
    const lastAvailableSlot = orgContent.length - 1;

    const eventEnd = ( step + newLength ) - 1; // last step index of the events new range
    const nextIndex = eventEnd + 1; // index of the first event following the moved event

    function act(): void {
        const channel = song.patterns[ patternIndex ].channels[ channelIndex ]; // get latest ref!

        for ( let i = step + 1; i <= eventEnd; ++i ) {
            // in case the new range of the event contains noteOn actions for longer events, we
            // push the noteOn forwards (and effectively shorten the duration of the subsequent event)
            moveEventToNextSlotIfFree( song, patternIndex, channelIndex, i, true );
        }
        // when event (after resizing) is not directly followed by another, we add a
        // note off event so we maintain the intended event duration
        if ( nextIndex <= lastAvailableSlot && nonExistentOrAutomationOnly( channel[ nextIndex ] )) {
            insertNoteOff( song, patternIndex, channelIndex, nextIndex, true );
        }
        invalidateCache( store, song, channelIndex );
    }
    act();

    return {
        undo(): void {
            // clone() is necessary to avoid conflicts when stepping the history state back and forth
            Vue.set( song.patterns[ patternIndex ].channels, channelIndex, clone( orgContent ));
            invalidateCache( store, song, channelIndex );
        },
        redo: act,
    };
}
