import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import DeletePattern from "@/model/actions/pattern-delete";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { EffluxSong } from "@/model/types/song";
import { createMockStore } from "../../mocks";

describe( "Pattern delete action", () => {
    const store = createMockStore();
    let song: EffluxSong;
    let activeOrderIndex: number;
    let activePatternIndex: number;
    let orgPatternOrder: EffluxPatternOrder;
    let orgPatterns: EffluxPattern[];
    
    beforeEach(() => {
        song = SongFactory.create();
        song.patterns = [
            PatternFactory.create( 16 ),
            PatternFactory.create( 8 ),
            PatternFactory.create( 32 ),
        ];        
        song.order = [ 0, 1, 2 ];
        store.state.song.activeSong = song;

        activeOrderIndex   = 1;
        activePatternIndex = song.order[ activeOrderIndex ];
        orgPatterns = [ ...song.patterns ];
        orgPatternOrder = [ ...song.order ];

        store.getters.activeOrderIndex = activeOrderIndex;
        store.getters.activePatternIndex = activePatternIndex;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe( "when no pattern index has been provided", () => {
        it( "should remove the currently active pattern from the songs pattern list", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", [
                orgPatterns[ 0 ], orgPatterns[ 2 ]
            ]);
        });

        it( "should update the pattern order list while decrementing the pattern index of the patterns following the deleted one", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", [ 0, 1 ]);
        });

        it( "should update the pattern index to the previous patterns index", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store );

            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", activePatternIndex );
        });

        it( "should not adjust the current order index", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store );

            expect( commitSpy ).not.toHaveBeenCalledWith( "setActiveOrderIndex", expect.any( Number ) );
        });

        it( "should restore all original values on undo", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            const { undo } = DeletePattern( store );

            vi.restoreAllMocks();

            undo();

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", orgPatterns );
            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", orgPatternOrder );
            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", activePatternIndex );
            expect( commitSpy ).toHaveBeenCalledWith( "setActiveOrderIndex", activeOrderIndex );
        });
    });

    describe( "when a pattern index has been provided", () => {
        it( "should remove the pattern at the provided index from the songs pattern list", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store, 2 );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", [
                orgPatterns[ 0 ], orgPatterns[ 1 ]
            ]);
        });

        it( "should update the pattern order list while decrementing the pattern index of the patterns following the deleted one", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store, 0 );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", [ 0, 1 ]);
        });

        it( "should keep the same pattern index when any pattern but the last one as removed", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store, 1 );

            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", 1 );
        });

        it( "should update the pattern index to the previous patterns index when the last pattern was removed", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            DeletePattern( store );

            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", 1 );
        });

        it( "should adjust the current order index when the last pattern was removed", () => {
            const commitSpy = vi.spyOn( store, "commit" );
            commitSpy.mockImplementation(( fn: string, args: any ) => {
                if ( fn === "replacePatternOrder" ) {
                    song.order = args;
                 }
            });

            store.getters.activeOrderIndex = 2;
            DeletePattern( store, 2 );

            expect( commitSpy ).toHaveBeenCalledWith( "setActiveOrderIndex", 1 );
        });

        it( "should restore all original values on undo", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            const { undo } = DeletePattern( store );

            vi.restoreAllMocks();

            undo();

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", orgPatterns );
            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", orgPatternOrder );
            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", activePatternIndex );
            expect( commitSpy ).toHaveBeenCalledWith( "setActiveOrderIndex", activeOrderIndex );
        });
    });
});