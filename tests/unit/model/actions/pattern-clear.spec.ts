import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import ClearPattern from "@/model/actions/pattern-clear";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxSong } from "@/model/types/song";
import { createMockStore } from "../../mocks";

describe( "Pattern clear action", () => {
    const store = createMockStore();
    let song: EffluxSong;
    let activePatternIndex: number;
    let orgPattern: EffluxPattern;
    
    beforeEach(() => {
        song = SongFactory.create();
        store.state.song.activeSong = song;
        song.patterns = [
            PatternFactory.create( 8 ),
            PatternFactory.create( 8 ),
        ];        
        song.order = [ 0 ];
 
        activePatternIndex = 1;
        orgPattern = song.patterns[ activePatternIndex ];

        for ( let i = 0; i < 3; ++i ) {
            song.patterns[ activePatternIndex ].channels[ 0 ][ i ] = EventFactory.create( 0, "C", 3 );
        }

        store.getters.activePatternIndex = activePatternIndex;
        store.getters.amountOfSteps = song.patterns[ activePatternIndex ].steps;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should be able to clear the contents of the currently active pattern by replacing it with a new empty pattern of the same size", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        ClearPattern( store );

        expect( commitSpy ).toHaveBeenCalledWith( "replacePattern", {
            patternIndex: activePatternIndex,
            pattern: PatternFactory.create( store.getters.amountOfSteps ),
        });
    });

    it( "should be able to revert to the previous pattern and its full contents on undo", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        const { undo } = ClearPattern( store );

        vi.restoreAllMocks();

        undo();

        expect( commitSpy ).toHaveBeenCalledWith( "replacePattern", {
            patternIndex: activePatternIndex,
            pattern: orgPattern,
        });
    });
});