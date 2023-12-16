import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import { PITCH_UP } from "@/definitions/automatable-parameters";
import ResizeEvent from "@/model/actions/event-resize";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { createNoteOffEvent } from "@/model/actions/event-actions";
import type { EffluxPattern } from "@/model/types/pattern";
import { type EffluxAudioEvent, ACTION_AUTO_ONLY, ACTION_NOTE_ON, ACTION_NOTE_OFF } from "@/model/types/audio-event";
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

describe( "Event resize action", () => {
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
        
        event1 = EventFactory.create( channelIndex, "C", 3, ACTION_NOTE_ON ); // from 0 - 1
        event2 = EventFactory.create( channelIndex, "", 0, ACTION_NOTE_OFF ); // from 1 - 4
        event3 = EventFactory.create( channelIndex, "F", 3, ACTION_NOTE_ON ); // from 4 - 7
        event4 = EventFactory.create( channelIndex, "G", 3, ACTION_NOTE_ON ); // from 7

        pattern.channels[ channelIndex ] = [
            event1, event2, 0, 0, event3, 0, 0, event4
        ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to expand its length", () => {
        const step = pattern.channels[ channelIndex ].indexOf( event1 );
        const newLength = 2;

        ResizeEvent( store, patternIndex, channelIndex, step, newLength );

        // original order was: [ event1, event2, 0, 0, event3, 0, 0, event4 ]
        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, 0, NOTE_OFF_EVENT, 0, event3, 0, 0, event4
        ]);
    });

    it( "should be able to contract its length", () => {
        const step = pattern.channels[ channelIndex ].indexOf( event3 );
        const newLength = 1;

        ResizeEvent( store, patternIndex, channelIndex, step, newLength );

        // original order was: [ event1, event2, 0, 0, event3, 0, 0, event4 ]
        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, event2, 0, 0, event3, NOTE_OFF_EVENT, 0, event4
        ]);
    });

    it( "should take the optional module automation-only instruction that existed at the events new last slot position", () => {
        const mpEvent = EventFactory.create( channelIndex, "", 0, ACTION_AUTO_ONLY, {
            module: PITCH_UP,
            value: 50,
            glide: true,
        });
        const mp = { ...mpEvent.mp };
        pattern.channels[ channelIndex ][ 3 ] = mpEvent;

        const step = pattern.channels[ channelIndex ].indexOf( event2 );
        const newLength = 2;

        ResizeEvent( store, patternIndex, channelIndex, step, newLength );

        // original order was: [ event1, event2, 0, mpEvent, event3, 0, 0, event4 ]
        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, event2, 0, expect.any( Object ), event3, 0, 0, event4
        ]);

        expect( pattern.channels[ channelIndex ][ 3 ]).toEqual({
            ...NOTE_OFF_EVENT,
            mp,
        });
    });

    it( "should be able to contract its length when it occupies the last slot in the pattern", () => {
        pattern.channels[ channelIndex ] = [ event1, event2, 0, 0, event3, 0, event4, 0 ];
        const step = pattern.channels[ channelIndex ].indexOf( event4 );
        const newLength = 1;

        ResizeEvent( store, patternIndex, channelIndex, step, newLength );

        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, event2, 0, 0, event3, 0, event4, NOTE_OFF_EVENT
        ]);
    });

    it( "should be able to expand its length, cutting any existing notes", () => {
        const step = pattern.channels[ channelIndex ].indexOf( event1 );
        const newLength = 3;

        ResizeEvent( store, patternIndex, channelIndex, step, newLength );

        // original order was: [ event1, event2, 0, 0, event3, 0, 0, event4 ]
        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, 0, 0, event2, event3, 0, 0, event4
        ]);
    });

    it( "should maintain its length and cut the length of any existing (long duration) notes the new length would overlap", () => {
        const step = pattern.channels[ channelIndex ].indexOf( event2 );
        const newLength = 4;

        ResizeEvent( store, patternIndex, channelIndex, step, newLength );

        // original order was: [ event1, event2, 0, 0, event3, 0, 0, event4 ]
        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, event2, 0, 0, 0, event3, 0, event4
        ]);
    });

    it( "should keep the optionally defined module parameter automations that existed in its new range", () => {
        const mpEvent = EventFactory.create( channelIndex, "", 0, ACTION_AUTO_ONLY, {
            module: PITCH_UP,
            value: 50,
            glide: true,
        });
        const mp = { ...mpEvent.mp };
        pattern.channels[ channelIndex ][ 5 ] = mpEvent;

        const event3mp = {
            module: PITCH_UP,
            value: 77,
            glide: false,
        };
        event3.mp = { ...event3mp };
        
        const step = pattern.channels[ channelIndex ].indexOf( event2 );
        const newLength = 5; // will span from 1 - 5 

        ResizeEvent( store, patternIndex, channelIndex, step, newLength );

        // original order was: [ event1, event2, 0, 0, event3, mpEvent, 0, event4 ]
        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, event2, 0, 0, expect.any( Object ), expect.any( Object ), expect.any( Object ) /* event3 */, event4
        ]);

        // expect the original start position of event3 to only contain the parameter automation
        expect( pattern.channels[ channelIndex ][ 4 ]).toEqual({
            ...event3,
            mp: event3mp,
            action: ACTION_AUTO_ONLY,
            note: "",
            octave: 0,
        });

        // expect the original automation of mpEvent to still be present
        expect( pattern.channels[ channelIndex ][ 5 ]).toEqual({
            ...mpEvent,
            mp,
        });

        // new position of event3, without its original automation
        expect( pattern.channels[ channelIndex ][ 6 ]).toEqual({
            ...event3,
            mp: undefined,
        });
    });

    it( "should request an invalidation of the channel cache", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const step = pattern.channels[ channelIndex ].indexOf( event1 );
        ResizeEvent( store, patternIndex, channelIndex, step, 3 );

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    it( "should restore the original pattern on undo", () => {
        const mpEvent = EventFactory.create( channelIndex, "", 0, ACTION_AUTO_ONLY, {
            module: PITCH_UP,
            value: 50,
            glide: true,
        });
        pattern.channels[ channelIndex ][ 5 ] = mpEvent;

        event3.mp = {
            module: PITCH_UP,
            value: 77,
            glide: false,
        };
        
        const commitSpy = vi.spyOn( store, "commit" );
        
        const step = pattern.channels[ channelIndex ].indexOf( event2 );
        const newLength = 5; // will span from 1 - 5 

        const { undo } = ResizeEvent( store, patternIndex, channelIndex, step, newLength );
        undo();

        // original order was: [ event1, event2, 0, 0, event3, mpEvent, 0, event4 ]

        expect( pattern.channels[ channelIndex ]).toEqual([
            event1, event2, 0, 0, event3, mpEvent, 0, event4
        ]);
        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });
});
