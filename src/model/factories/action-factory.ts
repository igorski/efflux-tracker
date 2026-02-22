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
import Config from "@/config";
import Actions from "@/definitions/actions";
import EventUtil from "@/utils/event-util";
import { clone } from "@/utils/object-util";
import { ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { type EffluxAudioEvent } from "@/model/types/audio-event";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import type { EffluxState } from "@/store";

export default function( type: Actions, data: any ): IUndoRedoState | null {
    switch ( type ) {
        default:
            return null;

        case Actions.ADD_EVENTS:
            return addMultipleEventsAction( data );
    }
}

/* internal methods */

/**
 * adds multiple EffluxAudioEvent into a pattern
 */
function addMultipleEventsAction({ store, events } : { store: Store<EffluxState>, events: EffluxAudioEvent[] }): IUndoRedoState {

    const { state } = store;
    const song      = state.song.activeSong;

    // active instrument and pattern for event (can be different to currently visible pattern
    // e.g. undo/redo action performed when viewing another pattern)

    let patternIndex = store.getters.activePatternIndex,
        channelIndex = state.editor.selectedInstrument,
        step         = state.editor.selectedStep;

    // if there are existing events, cache them for undo-purpose (see add())

    const existingEvents: EffluxAudioEvent[] = [];
    function act(): void {
        const pattern = song.patterns[ patternIndex ];

        events.forEach(( event: EffluxAudioEvent, index: number ) => {
            const targetIndex = ( channelIndex + index ) % Config.INSTRUMENT_AMOUNT;
            const channel = pattern.channels[ targetIndex ];

            EventUtil.setPosition( event, pattern, step, song.meta.timing );

            // remove previous event if one existed at the insertion point
            // (but take its module parameter automation when existing for non-off events)

            if ( channel[ step ]) {
                existingEvents[ index ] = serialize( channel[ step ]);
                const stepEntry = channel[ step ] as EffluxAudioEvent;

                if ( event.action !== ACTION_NOTE_OFF && !event.mp && stepEntry.mp ) {
                    event.mp = clone( stepEntry.mp );
                }
                EventUtil.clearEvent( song, patternIndex, targetIndex, step );
            }
            channel[ step ] = event;
        });
    }
    act(); // perform action

    return {
        undo(): void {
            events.forEach(( _event: EffluxAudioEvent, index: number ) => {
                const targetIndex = ( channelIndex + index ) % Config.INSTRUMENT_AMOUNT;
                EventUtil.clearEvent(
                    song,
                    patternIndex,
                    targetIndex,
                    step,
                );
                // restore existing event if it was present during addition
                const existingEvent: EffluxAudioEvent = existingEvents[ index ];
                if ( existingEvent ) {
                    const restoredEvent = deserialize( existingEvent );
                    song.patterns[ patternIndex ].channels[ targetIndex ][ step ] = restoredEvent;
                }
            });
        },
        redo: act
    };
}

// when changing states of observables, we need to take heed to always restore
// a fresh clone from the last state as repeated undo/redo actions on (a cloned)
// object reference will mutate the reference to be different from its initial state

function serialize( object: any = null ): any {
    return object ? JSON.stringify( object ) : null;
}

function deserialize( serializedObject: any = null ): any {
    return serializedObject ? JSON.parse( serializedObject ) : null;
}
