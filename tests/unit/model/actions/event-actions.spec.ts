import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import { PITCH_UP } from "@/definitions/automatable-parameters";
import { createNoteOffEvent, insertEvent, invalidateCache, nonExistentOrAutomationOnly } from "@/model/actions/event-actions";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { ACTION_IDLE, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
import { EffluxSongType } from "@/model/types/song";
import { createMockStore } from "../../mocks";

const mockSetPosition = vi.fn();
vi.mock( "@/utils/event-util", () => ({
    default: {
        setPosition: ( ...args ) => mockSetPosition( ...args ),
    },
}));

describe( "Event actions", () => {
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
        const event = createNoteOffEvent( 0 );

        const patternIndex = 1;
        const channelIndex = 4;
        const step = 5;

        insertEvent( event, song, patternIndex, channelIndex, step );

        expect( mockSetPosition ).toHaveBeenCalledWith( event, song.patterns[ patternIndex ], step, song.meta.tempo );
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
        const MODULE_PARAM = {
            module: PITCH_UP,
            value: 77,
            glide: true,
        };

        it( "should return true when passing a 0 step value", () => {
            expect( nonExistentOrAutomationOnly( 0 )).toBe( true );
        });

        it( "should return true when passing an undefined reference", () => {
            expect( nonExistentOrAutomationOnly( undefined )).toBe( true );
        });

        it( "should return true when passing a parameter automation-only event", () => {
            const event = EventFactory.create( 0, "", 0, ACTION_IDLE );
            event.mp = { ...MODULE_PARAM };

            expect( nonExistentOrAutomationOnly( event )).toBe( true );
        });

        it( "should return false for a noteOn event", () => {
            const event = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON );
            event.mp = { ...MODULE_PARAM };

            expect( nonExistentOrAutomationOnly( event )).toBe( false );
        });

        it( "should return false for a noteOff event", () => {
            const event = createNoteOffEvent();
            event.mp = { ...MODULE_PARAM };

            expect( nonExistentOrAutomationOnly( event )).toBe( false );
        });
    });
});