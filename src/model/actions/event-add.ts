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
import Vue from "vue";
import type { Store } from "vuex";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import { type EffluxAudioEvent, EffluxAudioEventModuleParams, ACTION_IDLE, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { EffluxSongType } from "@/model/types/song";
import type { EffluxState } from "@/store";
import EventUtil, { getPrevEvent } from "@/utils/event-util";
import { clone } from "@/utils/object-util";
import { insertEvent, createNoteOffEvent, invalidateCache, nonExistentOrAutomationOnly } from "./event-actions";

type IUpdateHandler = ( advanceStep?: boolean ) => void;

export type OptEventData = Partial<{
    patternIndex: number,
    channelIndex: number,
    step: number,
    length: number;
    advanceOnAddition: boolean,
    newEvent: true,
}>;

/**
 * adds a single EffluxAudioEvent into a pattern
 */
export default function( store: Store<EffluxState>, event: EffluxAudioEvent,
    optEventData: OptEventData, updateHandler: IUpdateHandler ): IUndoRedoState {

    const { state } = store;
    const song  = state.song.activeSong;
    const isJam = song.type === EffluxSongType.JAM;

    // active instrument and pattern for event (can be different to currently visible pattern
    // e.g. undo/redo action performed when viewing another pattern)


    const patternIndex = optEventData?.patternIndex ?? store.getters.activePatternIndex;
    const channelIndex = optEventData?.channelIndex ?? state.editor.selectedInstrument;
    const step = optEventData?.step ?? state.editor.selectedStep;

    // currently active instrument and pattern (e.g. visible on screen)

    const length = optEventData?.length ?? 1;
    let advanceStepOnAddition = optEventData?.advanceOnAddition ?? true;
    
    // if there is an existing event, cache it for undo-purpose (see add())
    let existingEvent: EffluxAudioEvent;
    let existingEventMp: EffluxAudioEventModuleParams;

    const eventEnd = ( step + length ) - 1; // last step index of the events range
    const nextIndex = eventEnd + 1; // index of the first event following the created event

    const orgContent = ( length > 1 ) ? clone( song.patterns[ patternIndex ].channels[ channelIndex ] ) : undefined;

    const isParamAutomationOnly = !!event.mp && ( event.action === ACTION_IDLE || existingEvent );

    // if the event should be short (single step) in duration (e.g. in jam mode), ensure its followed by another
    // event otherwise we add a note off instruction to kill its playback on the next step
    const nextEvent = song.patterns[ patternIndex ].channels[ channelIndex ][ nextIndex ];
    const addNoteOff = ( isJam && !isParamAutomationOnly ) && nonExistentOrAutomationOnly( nextEvent );

    function act(): void {
        const pattern = song.patterns[ patternIndex ],
              channel = pattern.channels[ channelIndex ]; // get latest refs!

        EventUtil.setPosition( event, pattern, step, song.meta.tempo );

        // remove previous event if one existed at the insertion point
        // (but take its module parameter automation when existing for non-off events)

        if ( channel[ step ]) {
            existingEvent   = serialize( channel[ step ] as EffluxAudioEvent );
            existingEventMp = serialize(( channel[ step ] as EffluxAudioEvent ).mp );

            if ( event.action !== ACTION_NOTE_OFF && !event.mp && existingEventMp ) {
                Vue.set( event, "mp", deserialize( existingEventMp ));
            }
            EventUtil.clearEvent( song, patternIndex, channelIndex, step );
        }
        Vue.set( channel, step, event );

        if ( length > 1 ) {
            for ( let i = step + 1; i <= eventEnd; ++i ) {
                const nextStep = i + 1;
                // in case the range of the created event already contains noteOn actions for long events, we
                // push the noteOn forwards (and effectively shorten the duration of the subsequent event)
                if ( nextStep < channel.length && ( channel[ i ] as EffluxAudioEvent )?.action === ACTION_NOTE_ON && nonExistentOrAutomationOnly( channel[ nextStep ] )) {
                    const noteOnEvent = {
                        ...( channel[ i ] as EffluxAudioEvent ),
                        mp: ( channel[ nextStep ] as EffluxAudioEvent )?.mp ?? undefined, // take optional mp of next event
                    };
                    insertEvent( noteOnEvent, song, patternIndex, channelIndex, nextStep );
                }
                EventUtil.clearEvent( song, patternIndex, channelIndex, i, isJam );
            }
        }

        // when event is not directly followed by another, we add a note off event to maintain multi-step duration
        if ( addNoteOff && nextIndex <= channel.length - 1 && nonExistentOrAutomationOnly( channel[ nextIndex ] )) {
            const offEvent = createNoteOffEvent( channelIndex );
            if ( isJam && ( channel[ nextIndex ] as EffluxAudioEvent )?.mp ) {
                offEvent.mp = { ...( channel[ nextIndex ] as EffluxAudioEvent ).mp }; // keep automation though!
            }
            insertEvent( offEvent, song, patternIndex, channelIndex, nextIndex );
        }
        invalidateCache( store, song, channelIndex );
     
        if ( optEventData?.newEvent === true ) {

            // new events by default take the instrument of the previously declared note in
            // the current patterns event channel

            // @ts-expect-error first argument in comparator unused
            const prevEvent = getPrevEvent( song, event, channelIndex, song.order.indexOf( patternIndex ), ( a, b ): boolean => {
                // but don't take a noteOff instruction into account (as it is not assigned to an instrument)
                // keep on traversing backwards until we find a valid event
                return b.action === ACTION_NOTE_OFF;
            });

            // only do this for events within the same measure though

            if ( prevEvent && prevEvent.event.seq.startMeasure === event.seq.startMeasure &&
                 prevEvent.event.instrument !== channelIndex &&
                 event.instrument === channelIndex ) {

                event.instrument = prevEvent.event.instrument;
            }
        }
        updateHandler( advanceStepOnAddition );
        advanceStepOnAddition = false;
    }
    act(); // perform action

    return {
        undo(): void {
            if ( length > 1 ) {
                // clone() is necessary to avoid conflicts when stepping the history state back and forth
                Vue.set( song.patterns[ patternIndex ].channels, channelIndex, clone( orgContent ));
            } else {
                EventUtil.clearEvent(
                    song,
                    patternIndex,
                    channelIndex,
                    step,
                );
                // restore existing event if it was present during addition
                if ( existingEvent ) {
                    const restoredEvent = deserialize( existingEvent );
                    insertEvent( restoredEvent, song, patternIndex, channelIndex, step );
                }
                if ( addNoteOff ) {
                    EventUtil.clearEvent( song, patternIndex, channelIndex, step + 1, isJam );
                }
            }
            invalidateCache( store, song, channelIndex );
            updateHandler();
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
