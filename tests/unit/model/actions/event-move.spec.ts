import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import MoveEvent from "@/model/actions/event-move";
import { createNoteOffEvent } from "@/model/actions/event-actions";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import { type EffluxAudioEvent, ACTION_NOTE_ON } from "@/model/types/audio-event";
import { type EffluxSong, EffluxSongType } from "@/model/types/song";
import { createMockStore } from "../../mocks";

vi.mock( "@/utils/event-util", async () => {
    const actual = await vi.importActual( "@/utils/event-util" ) as object;
    return {
        ...actual,
        default: {
            ...actual.default,
            setPosition: vi.fn(), // by stubbing this we can compare event more easily
        }
    }
});

describe( "Event move action", () => {
    const store = createMockStore();
    
    const patternIndex = 0;
    const channelIndex = 0;

    let song: EffluxSong;
    let pattern: EffluxPattern;

    const NOTE_OFF_EVENT = createNoteOffEvent();

    let event1: EffluxAudioEvent;
    let event2: EffluxAudioEvent;
    let event3: EffluxAudioEvent;
    let event4: EffluxAudioEvent;

    beforeEach(() => {
        pattern = PatternFactory.create( 8 );
        song = SongFactory.create( 1, EffluxSongType.JAM );
        song.patterns = [ pattern ];
        store.state.song.activeSong = song;
        
        event1 = EventFactory.create( channelIndex, "C", 3, ACTION_NOTE_ON ); // from 0 - 2
        event2 = EventFactory.create( channelIndex, "D", 3, ACTION_NOTE_ON ); // from 2 - 4
        event3 = EventFactory.create( channelIndex, "F", 3, ACTION_NOTE_ON ); // from 4 - 7
        event4 = EventFactory.create( channelIndex, "G", 3, ACTION_NOTE_ON ); // from 7

        pattern.channels[ channelIndex ] = [
            event1, 0, event2, 0, event3, 0, 0, event4
        ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to move an event forwards", () => {
        const oldStep = pattern.channels[ channelIndex ].indexOf( event1 );
        const newStep = oldStep + 1;

        MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

        expect( pattern.channels[ channelIndex ][ newStep ]).toEqual( event1 );
    });

    it( "should be able to move an event backwards", () => {
        const oldStep = pattern.channels[ channelIndex ].indexOf( event3 );
        const newStep = oldStep - 1;

        MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

        expect( pattern.channels[ channelIndex ][ newStep ]).toEqual( event3 );
    });

    it( "should add a noteOff instruction at the events previous position", () => {
        const oldStep  = pattern.channels[ channelIndex ].indexOf( event3 );
        const newStep  = oldStep + 1;

        MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

        expect( pattern.channels[ channelIndex ][ oldStep ]).toEqual( NOTE_OFF_EVENT );
    });

    it( "should be able to update the note properties of a moved event, when provided", () => {
        const oldStep  = pattern.channels[ channelIndex ].indexOf( event1 );
        const newStep  = oldStep + 1;
        const optProps = { note: "D#", octave: 7 };

        MoveEvent( store, patternIndex, channelIndex, oldStep, newStep, optProps );

        const movedEvent = pattern.channels[ channelIndex ][ newStep ];

        expect( movedEvent ).toEqual({
            ...event1,
            ...optProps,
        });
    });

    it( "should request an invalidation of the channel cache", () => {
        const commitSpy = vi.spyOn( store, "commit" );
        const oldStep  = pattern.channels[ channelIndex ].indexOf( event3 );

        MoveEvent( store, patternIndex, channelIndex, oldStep, oldStep + 1 );

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    describe( "when the events duration last for longer than a single pattern step", () => {
        it( "should maintain its length when its range is between two other events", () => {
            const oldStep = pattern.channels[ channelIndex ].indexOf( event1 );
            const newStep = 5;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );
 
            // original order was:
            // [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( pattern.channels[ channelIndex ]).toEqual([
                NOTE_OFF_EVENT, 0, event2, 0, event3, event1, 0, event4
            ]);
        });

        it( "should maintain its length when no other event overlaps in the new range", () => {
            const oldStep = pattern.channels[ channelIndex ].indexOf( event1 );
            const newStep = 4;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );
 
            // original order was:
            // [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( pattern.channels[ channelIndex ]).toEqual([
                NOTE_OFF_EVENT, 0, event2, 0, event1, 0, NOTE_OFF_EVENT, event4
            ]);
        });

        it( "should maintain its length when its the last event in the pattern", () => {
            const oldStep = pattern.channels[ channelIndex ].indexOf( event1 );
            const newStep = 6;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

            // original order was:
            // [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( pattern.channels[ channelIndex ]).toEqual([
                NOTE_OFF_EVENT, 0, event2, 0, event3, 0, event1, 0
            ]);
        });

        it( "should maintain its length and erase any existing overlapping notes with a short duration", () => {
            // we will shorten the duration of event3 to only last for a single step
            pattern.channels[ channelIndex ] = [
                event1, 0, event2, 0, event3, NOTE_OFF_EVENT, 0, event4
            ];
            const oldStep = pattern.channels[ channelIndex ].indexOf( event1 );
            const newStep = 3;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

            expect( pattern.channels[ channelIndex ]).toEqual([
                NOTE_OFF_EVENT, 0, event2, event1, 0, NOTE_OFF_EVENT, 0, event4
            ]);
        });

        it( "should maintain its length when its the last event and is moved backwards", () => {
            // we will shorten the duration of event3 to only last for two steps, and we remove the last event
            pattern.channels[ channelIndex ] = [
                event1, 0, event2, 0, 0, 0, event3, 0
            ];
            const oldStep = pattern.channels[ channelIndex ].indexOf( event3 );
            const newStep = oldStep - 2;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

            expect( pattern.channels[ channelIndex ]).toEqual([
                event1, 0, event2, 0, event3, 0, NOTE_OFF_EVENT, 0
            ]);
        });

        it( "should maintain its length and cut the length of any existing overlapping (long duration) notes, when moving back", () => {
            const oldStep = pattern.channels[ channelIndex ].indexOf( event3 );
            const newStep = oldStep - 1;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

            // original order was:
            // [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( pattern.channels[ channelIndex ]).toEqual([
                event1, 0, event2, event3, 0, 0, NOTE_OFF_EVENT, event4
            ]);
        });

        it( "should maintain its length and cut the length of any existing overlapping (long duration) notes, when moving forward", () => {
            const oldStep = pattern.channels[ channelIndex ].indexOf( event2 );
            const newStep = oldStep + 1;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

            // original order was:
            // [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( pattern.channels[ channelIndex ]).toEqual([
                event1, 0, NOTE_OFF_EVENT, event2, 0, event3, 0, event4
            ]);
        });

        it( "should maintain its length when its the last event in the pattern and is moved forward", () => {
            pattern.channels[ channelIndex ] = [
                event1, 0, event2, event3, 0, NOTE_OFF_EVENT, 0, 0
            ]
            const oldStep = pattern.channels[ channelIndex ].indexOf( event3 );
            const newStep = 5;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

            expect( pattern.channels[ channelIndex ]).toEqual([
                event1, 0, event2, NOTE_OFF_EVENT, 0, event3, 0, NOTE_OFF_EVENT
            ]);
        });

        it( "should cut its length when its new position has less free slots available than the events current total duration", () => {
            const oldStep = pattern.channels[ channelIndex ].indexOf( event3 );
            const newStep = 6;
    
            MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

            // original order was:
            // [ event1, 0, event2, 0, event3, 0, 0, event4 ]
            expect( pattern.channels[ channelIndex ]).toEqual([
                event1, 0, event2, 0, NOTE_OFF_EVENT, 0, event3, 0
            ]);
        });
    });

    it( "should restore the original pattern on undo", () => {
        const commitSpy = vi.spyOn( store, "commit" );
        const oldStep = pattern.channels[ channelIndex ].indexOf( event1 );
        const newStep = 3;

        const { undo } = MoveEvent( store, patternIndex, channelIndex, oldStep, newStep );

        undo();

        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, 0, event2, 0, event3, 0, 0, event4
        ]);
        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });
});
