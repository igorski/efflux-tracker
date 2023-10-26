import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import PatternPaste from "@/model/actions/pattern-paste";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import { type EffluxAudioEvent, ACTION_NOTE_ON } from "@/model/types/audio-event";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";
import { createMockStore } from "../../mocks";

describe( "Pattern paste action", () => {
    const store = createMockStore();
    const activePatternIndex = 1;
    let orgPattern: EffluxPattern;
    let patternToPaste: EffluxPattern;
    let song: EffluxSong;
    let event1: EffluxAudioEvent;
    let event2: EffluxAudioEvent;
    
    beforeEach(() => {
        song = SongFactory.create();
        store.state.song.activeSong = song;

        song.patterns = [
            PatternFactory.create( 4 ),
            PatternFactory.create( 4 ),
        ];

        orgPattern = song.patterns[ activePatternIndex ];
        patternToPaste = PatternFactory.create( 4 );

        event1 = EventFactory.create( 0, "C", 3, ACTION_NOTE_ON );
        event2 = EventFactory.create( 0, "D", 3, ACTION_NOTE_ON );

        orgPattern.channels[ 0 ][ 0 ] = event1;  
        patternToPaste.channels[ 0 ][ 1 ] = event2;

        // @ts-expect-error getters is readonly
        store.getters = {
            activeSong: song,
            activePatternIndex,
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should insert the copied pattern content into the currently active pattern", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        PatternPaste( store, patternToPaste );

        expect( commitSpy ).toHaveBeenNthCalledWith( 1, "replacePattern", {
            patternIndex: activePatternIndex,
            pattern: expect.any( Object )
        });
        const { pattern } = commitSpy.mock.calls[ 0 ][ 1 ];

        expect( pattern.channels[ 0 ][ 0 ]).toEqual( event1 );
        expect( pattern.channels[ 0 ][ 1 ]).toEqual( event2 );
    });

    it( "should invalidate the sequencer channel cache", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        PatternPaste( store, patternToPaste );

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    it( "should restore the original values appropriately on undo", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const { undo } = PatternPaste( store, patternToPaste );

        vi.restoreAllMocks();

        undo();

        expect( commitSpy ).toHaveBeenCalledWith( "replacePattern", {
            patternIndex: activePatternIndex,
            pattern: orgPattern,
        });
    });
});
