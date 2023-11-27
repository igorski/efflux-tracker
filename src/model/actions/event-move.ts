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
import { type EffluxAudioEvent, ACTION_NOTE_ON } from "@/model/types/audio-event";
import { EffluxSongType } from "@/model/types/song";
import type { EffluxState } from "@/store";
import EventUtil, { getNextEvent } from "@/utils/event-util";
import { clone } from "@/utils/object-util";
import { createNoteOffEvent, insertEvent, invalidateCache } from "./event-actions";

export default function( store: Store<EffluxState>,
    patternIndex: number, channelIndex: number,
    oldStep: number, newStep: number,
    optProps: Partial<EffluxAudioEvent> = {}): IUndoRedoState
{
    const song = store.state.song.activeSong;

    if ( song.type !== EffluxSongType.JAM ) {
        // @ts-expect-error 'import.meta' property not allowed, not an issue Vite takes care of it
        if ( import.meta.env.MODE !== "production" ) {
            console.error( "Event move was created for JAM mode exclusively" );
        }
        return;
    }

    const channel = song.patterns[ patternIndex ].channels[ channelIndex ];
    const orgContent = clone( channel );
    const lastAvailableSlot = channel.length - 1;
    
    const orgEvent = channel[ oldStep ] as EffluxAudioEvent;
    const newEvent = { ...orgEvent, ...optProps };

    const nextEvent = getNextEvent( song, orgEvent, channelIndex, patternIndex );
    let eventLength = channel.length - oldStep; // length in pattern steps, defaults to continue until the end of the pattern...
    // ...unless its followed by another event
    if ( nextEvent ) {
        const nextEventStep = channel.indexOf( nextEvent.event );
        eventLength = nextEventStep - oldStep;
    }

    const eventEnd  = Math.min( lastAvailableSlot, ( newStep + eventLength ) - 1 ); // last step index of the events new range
    const nextIndex = eventEnd + 1; // index of the first slot following the moved event

    function act(): void {
        insertEvent( createNoteOffEvent( channelIndex ), song, patternIndex, channelIndex, oldStep );
        insertEvent( newEvent, song, patternIndex, channelIndex, newStep );

        if ( eventLength > 1 ) {
            for ( let i = newStep + 1; i <= eventEnd; ++i ) {
                const nextStep = i + 1;
                // in case the new range of the event contains noteOn actions for longer events, we
                // push the noteOn forwards (and effectively shorten the duration of the subsequent event)
                if ( nextStep < channel.length && ( channel[ i ] as EffluxAudioEvent )?.action === ACTION_NOTE_ON && !channel[ nextStep ]) {
                    insertEvent( channel[ i ] as EffluxAudioEvent, song, patternIndex, channelIndex, nextStep );
                }
                EventUtil.clearEvent( song, patternIndex, channelIndex, i );
            }
        }

        // when event (after repositioning) is not directly followed by another, we add a
        // note off event so we maintain the original event duration
        if ( nextIndex <= lastAvailableSlot && !channel[ nextIndex ] ) {
            insertEvent( createNoteOffEvent( channelIndex ), song, patternIndex, channelIndex, nextIndex );
        }
        invalidateCache( store, song, channelIndex );
    }
    act(); // perform action

    return {
        undo(): void {
            // clone() is necessary to avoid conflicts when stepping the history state back and forth
            Vue.set( song.patterns[ patternIndex ].channels, channelIndex, clone( orgContent ));
            invalidateCache( store, song, channelIndex );
        },
        redo: act
    };
}
