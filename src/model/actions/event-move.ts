import type { Store, createStore } from "vuex";
import type { IUndoRedoState } from "@/model/factories/history-state-factory";
import { type EffluxAudioEvent, ACTION_AUTO_ONLY } from "@/model/types/audio-event";
import { EffluxSongType } from "@/model/types/song";
import type { EffluxState } from "@/store";
import { getNextEvent } from "@/utils/event-util";
import { clone } from "@/utils/object-util";
import {
    createNoteOffEvent, insertEvent, invalidateCache,
    nonExistentOrAutomationOnly, moveEventToNextSlotIfFree, insertNoteOff
} from "./event-actions";

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

    let channel = song.patterns[ patternIndex ].channels[ channelIndex ];
    const orgContent = clone( channel );
    const lastAvailableSlot = channel.length - 1;
    
    const orgEvent = channel[ oldStep ] as EffluxAudioEvent;
    const newEvent = { ...orgEvent, ...optProps };
    const orgMp    = orgEvent.mp ? { ...orgEvent.mp } : undefined;

    // @ts-expect-error first argument unused
    const nextEvent = getNextEvent( song, orgEvent, channelIndex, patternIndex, ( evt, compareEvent ) => {
        return nonExistentOrAutomationOnly( compareEvent );
    });
    let eventLength = channel.length - oldStep; // length in pattern steps, defaults to continue until the end of the pattern...
    // ...unless its followed by another event
    if ( nextEvent ) {
        const nextEventStep = channel.indexOf( nextEvent.event );
        eventLength = nextEventStep - oldStep;
    }
    const eventEnd  = Math.min( lastAvailableSlot, ( newStep + eventLength ) - 1 ); // last step index of the events new range
    const nextIndex = eventEnd + 1; // index of the first slot following the moved event

    function act(): void {
        channel = song.patterns[ patternIndex ].channels[ channelIndex ]; // grab latest ref!

        insertEvent({
            ...createNoteOffEvent( channelIndex ),
            mp: orgMp ? { ...orgMp } : undefined,
        }, song, patternIndex, channelIndex, oldStep );

        insertEvent({
            ...newEvent,
            mp: ( channel[ newStep ] as EffluxAudioEvent )?.mp ? { ...( channel[ newStep ] as EffluxAudioEvent ).mp } : undefined,
        }, song, patternIndex, channelIndex, newStep );

        if ( eventLength > 1 ) {
            for ( let i = newStep + 1; i <= eventEnd; ++i ) {
                // in case the new range of the event contains noteOn actions for longer events, we
                // push the noteOn forwards (and effectively shorten the duration of the subsequent event)
                moveEventToNextSlotIfFree( song, patternIndex, channelIndex, i, true );
            }
        }

        // when event (after repositioning) is not directly followed by another, we add a
        // note off event so we maintain the original event duration
        if ( nextIndex <= lastAvailableSlot && nonExistentOrAutomationOnly( channel[ nextIndex ] )) {
            insertNoteOff( song, patternIndex, channelIndex, nextIndex, true );
        }
        invalidateCache( store, song, channelIndex );
    }
    act(); // perform action

    return {
        undo(): void {
            // clone() is necessary to avoid conflicts when stepping the history state back and forth
            song.patterns[ patternIndex ].channels[channelIndex] = clone( orgContent );
            invalidateCache( store, song, channelIndex );
        },
        redo: act
    };
}
