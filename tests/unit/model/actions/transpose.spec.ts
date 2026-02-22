import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import transpose from "@/model/actions/transpose";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { ACTION_NOTE_ON, type EffluxAudioEvent } from "@/model/types/audio-event";
import { EffluxPattern } from "@/model/types/pattern";
import { type EffluxSong } from "@/model/types/song";
import { createMockStore } from "../../mocks";

describe( "Transpose action", () => {
    const AMOUNT_OF_INSTRUMENTS = 4;

    const store = createMockStore();
    let song: EffluxSong;

    beforeEach(() => {
        song = SongFactory.create( AMOUNT_OF_INSTRUMENTS );
        store.state.song.activeSong = song;

        // 4 patterns total
        song.patterns.push( PatternFactory.create());
        song.patterns.push( PatternFactory.create());
        song.patterns.push( PatternFactory.create());

        song.patterns[ 0 ].channels[ 0 ][ 0 ] = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON );
        song.patterns[ 0 ].channels[ 1 ][ 4 ] = EventFactory.create( 0, "F", 1, ACTION_NOTE_ON );
        song.patterns[ 1 ].channels[ 2 ][ 7 ] = EventFactory.create( 0, "D", 2, ACTION_NOTE_ON );
        song.patterns[ 3 ].channels[ 0 ][ 4 ] = EventFactory.create( 0, "E", 4, ACTION_NOTE_ON );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to transpose events in all pattern and channel ranges", () => {
        const commitSpy = vi.spyOn( store, "commit" );
        
        transpose( store, 2, 0, 3, 0, AMOUNT_OF_INSTRUMENTS - 1 );

        const updatedPatterns = commitSpy.mock.calls[ 0 ][ 1 ] as EffluxPattern[];
        const event1 = updatedPatterns[ 0 ].channels[ 0 ][ 0 ] as EffluxAudioEvent;
        const event2 = updatedPatterns[ 0 ].channels[ 1 ][ 4 ] as EffluxAudioEvent;
        const event3 = updatedPatterns[ 1 ].channels[ 2 ][ 7 ] as EffluxAudioEvent;
        const event4 = updatedPatterns[ 3 ].channels[ 0 ][ 4 ] as EffluxAudioEvent;

        expect( event1.note ).toBe( "D" );
        expect( event2.note ).toBe( "G" );
        expect( event3.note ).toBe( "E" );
        expect( event4.note ).toBe( "F#" );
    });

    it( "should be able to transpose only events in a specific channel range", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        transpose( store, 2, 0, 3, 0, 1 );

        const updatedPatterns = commitSpy.mock.calls[ 0 ][ 1 ] as EffluxPattern[];
        const event1 = updatedPatterns[ 0 ].channels[ 0 ][ 0 ] as EffluxAudioEvent;
        const event2 = updatedPatterns[ 0 ].channels[ 1 ][ 4 ] as EffluxAudioEvent;
        const event3 = updatedPatterns[ 1 ].channels[ 2 ][ 7 ] as EffluxAudioEvent;
        const event4 = updatedPatterns[ 3 ].channels[ 0 ][ 4 ] as EffluxAudioEvent;

        expect( event1.note ).toBe( "D" );
        expect( event2.note ).toBe( "G" );
        expect( event3.note ).toBe( "D" );  // unchanged because out of channel range
        expect( event4.note ).toBe( "F#" );
    });

    it( "should be able to transpose only events in a specific pattern range", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        transpose( store, 2, 0, 1, 0, AMOUNT_OF_INSTRUMENTS - 1 );

        const updatedPatterns = commitSpy.mock.calls[ 0 ][ 1 ] as EffluxPattern[];
        const event1 = updatedPatterns[ 0 ].channels[ 0 ][ 0 ] as EffluxAudioEvent;
        const event2 = updatedPatterns[ 0 ].channels[ 1 ][ 4 ] as EffluxAudioEvent;
        const event3 = updatedPatterns[ 1 ].channels[ 2 ][ 7 ] as EffluxAudioEvent;
        const event4 = updatedPatterns[ 3 ].channels[ 0 ][ 4 ] as EffluxAudioEvent;

        expect( event1.note ).toBe( "D" );
        expect( event2.note ).toBe( "G" );
        expect( event3.note ).toBe( "E" );
        expect( event4.note ).toBe( "E" ); // unchanged because out of pattern range
    });

    it( "should invalidate the channel cache", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        transpose( store, 2, 0, 3, 0, AMOUNT_OF_INSTRUMENTS - 1 );

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    it( "should restore the original values appropriately on undo", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const originalPatterns = song.patterns;

        const { undo } = transpose( store, 2, 0, 3, 0, AMOUNT_OF_INSTRUMENTS - 1 );

        vi.clearAllMocks();

        undo();

        expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", originalPatterns );
        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });
});
