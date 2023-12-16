import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import { PITCH_UP } from "@/definitions/automatable-parameters";
import {
    createNoteOffEvent, insertEvent, invalidateCache, nonExistentOrAutomationOnly,
    moveEventToNextSlotIfFree, insertNoteOff,
} from "@/model/actions/event-actions";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxAudioEvent, ACTION_AUTO_ONLY, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { EffluxSongType } from "@/model/types/song";
import EventUtil from "@/utils/event-util";
import { createMockStore } from "../../mocks";

describe( "Event actions", () => {
    const MODULE_PARAM = {
        module: PITCH_UP,
        value: 77,
        glide: true,
    };
    const song = SongFactory.create();

    beforeEach(() => {
        song.patterns = [
            PatternFactory.create( 8 ), PatternFactory.create( 8 )
        ];
        song.order = [ 0, 1 ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it(" should be able to create a noteOff event for a specific instrument channel", () => {
        const event = createNoteOffEvent( 2 );

        expect( event.instrument ).toEqual( 2 );
        expect( event.action ).toEqual( ACTION_NOTE_OFF );
    });

    it( "should be able to insert an event into the sequencer, calculating the appropriate properties", () => {
        const setPositionSpy = vi.spyOn( EventUtil, "setPosition" );

        const event = createNoteOffEvent( 0 );

        const patternIndex = 1;
        const channelIndex = 4;
        const step = 5;

        insertEvent( event, song, patternIndex, channelIndex, step );

        expect( setPositionSpy ).toHaveBeenCalledWith( event, song.patterns[ patternIndex ], step, song.meta.tempo );
        expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step ]).toEqual( event );
    });

    describe( "when invalidating the sequencer cache", () => {
        const store = createMockStore();

        it( "should request an invalidation of the channel cache for given song", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            invalidateCache( store, song, 2 );

            expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
        });

        it( "should not flush the jam channels for non-JAM type songs", () => {
            const commitSpy = vi.spyOn( store, "commit" );
            song.type = EffluxSongType.TRACKER;

            invalidateCache( store, song, 2 );

            expect( commitSpy ).not.toHaveBeenCalledWith( "flushJamChannel", 2 );
        });

        it( "should flush the jam channels for JAM-type songs", () => {
            const commitSpy = vi.spyOn( store, "commit" );
            song.type = EffluxSongType.JAM;

            invalidateCache( store, song, 2 );

            expect( commitSpy ).toHaveBeenCalledWith( "flushJamChannel", 2 );
        });
    });

    describe( "when determining whether given event is non-existent or describes a parameter automation only", () => {
        it( "should return true when passing a 0 step value", () => {
            expect( nonExistentOrAutomationOnly( 0 )).toBe( true );
        });

        it( "should return true when passing an undefined reference", () => {
            expect( nonExistentOrAutomationOnly( undefined )).toBe( true );
        });

        it( "should return true when passing a parameter automation-only event", () => {
            const event = EventFactory.create( 0, "", 0, ACTION_AUTO_ONLY, { ...MODULE_PARAM });

            expect( nonExistentOrAutomationOnly( event )).toBe( true );
        });

        it( "should return false for a noteOn event", () => {
            const event = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON, { ...MODULE_PARAM });

            expect( nonExistentOrAutomationOnly( event )).toBe( false );
        });

        it( "should return false for a noteOff event", () => {
            const event = createNoteOffEvent();
            event.mp = { ...MODULE_PARAM };

            expect( nonExistentOrAutomationOnly( event )).toBe( false );
        });
    });

    describe( "when moving an event to the next slot inside a pattern", () => {
        let event: EffluxAudioEvent;
        const patternIndex = 0;
        const channelIndex = 0;
        const step = 2;
        
        beforeEach(() => {
            event = EventFactory.create( channelIndex, "C", 3, ACTION_NOTE_ON, { ...MODULE_PARAM });
            song.patterns[ patternIndex ].channels[ channelIndex ][ step ] = event;
        });

        it( "should not move the event to the requested step, when the slot is occupied by a note action", () => {
            const event2 = EventFactory.create( channelIndex, "", 2, ACTION_NOTE_OFF );
            song.patterns[ patternIndex ].channels[ channelIndex ][ step + 1 ] = event2;

            moveEventToNextSlotIfFree( song, patternIndex, channelIndex, step, false );

            expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step + 1 ]).toEqual( event2 );
        });

        it( "should move the event to the requested step, when the slot is free", () => {
            moveEventToNextSlotIfFree( song, patternIndex, channelIndex, step, false );

            expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step + 1 ]).toEqual( event );
        });

        it( "should clear the value at the events previous step", () => {
            moveEventToNextSlotIfFree( song, patternIndex, channelIndex, step, false );

            expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step ]).toEqual( 0 );
        });

        describe( "and parameter automation should be maintained", () => {
            it( "should leave the parameter automation at the events previous step when automation should be maintained", () => {
                moveEventToNextSlotIfFree( song, patternIndex, channelIndex, step, true );

                expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step ]).toEqual({
                    ...EventFactory.create(),
                    seq: expect.any( Object ), // offset calculation is different test (EventUtil.setPosition)
                    action: ACTION_AUTO_ONLY,
                    note: "",
                    octave: 0,
                    mp: MODULE_PARAM,
                });
            });

            it( "should have no parameter automation once moved to the new slot", () => {
                moveEventToNextSlotIfFree( song, patternIndex, channelIndex, step, true );

                expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step + 1 ]).toEqual({
                    ...event,
                    mp: undefined,
                });
            });

            it( "should adopt the parameter automation when there is an existing automation-only event at the new slot", () => {
                const event2 = EventFactory.create( channelIndex, "", 2, ACTION_AUTO_ONLY, {
                    module: PITCH_UP,
                    value: 20,
                    glide: false,
                });
                const mp = { ...event2.mp };
                song.patterns[ patternIndex ].channels[ channelIndex ][ step + 1 ] = event2;
                
                moveEventToNextSlotIfFree( song, patternIndex, channelIndex, step, true );
                
                expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step + 1 ]).toEqual({
                    ...event,
                    mp,
                });
            });
        });
    });

    describe( "when inserting a noteOff event into a pattern", () => {
        let event: EffluxAudioEvent;
        const patternIndex = 0;
        const channelIndex = 0;
        const step = 2;

        beforeEach(() => {
            event = EventFactory.create( channelIndex, "C", 3, ACTION_NOTE_ON, { ...MODULE_PARAM });
            song.patterns[ patternIndex ].channels[ channelIndex ][ step ] = event;
        });

        it( "should insert a new noteOff event at the requested step", () => {
            insertNoteOff( song, patternIndex, channelIndex, step, false );

            expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step ]).toEqual({
                ...createNoteOffEvent( channelIndex ),
                seq: expect.any( Object ), // offset calculation is different test (EventUtil.setPosition)
            });
        });

        it( "should not adopt the module parameter automation of any existing event at the requested step", () => {
            insertNoteOff( song, patternIndex, channelIndex, step, false );

            expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step ].mp ).toBeUndefined();
        });

        it( "should adopt the module parameter automation of any existing event at the requested step, when requested", () => {
            insertNoteOff( song, patternIndex, channelIndex, step, true );

            expect( song.patterns[ patternIndex ].channels[ channelIndex ][ step ] ).toEqual({
                ...createNoteOffEvent( channelIndex ),
                seq: expect.any( Object ), // offset calculation is different test (EventUtil.setPosition)
                mp: MODULE_PARAM,
            });
        });
    });
});