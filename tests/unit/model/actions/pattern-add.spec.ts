import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import PatternAdd from "@/model/actions/pattern-add";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { EffluxSong } from "@/model/types/song";
import PatternUtil from "@/utils/pattern-util";
import { createMockStore } from "../../mocks";
import patternAdd from "../../../../src/model/actions/pattern-add";

describe( "Pattern add action", () => {
    let song: EffluxSong;
    
    beforeEach(() => {
        song = SongFactory.create();
        song.patterns = [
            PatternFactory.create( 16 ),
            PatternFactory.create( 8 ),
            PatternFactory.create( 32 ),
        ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe( "when use of pattern order is disabled", () => {
        const store = createMockStore();
        const activeOrderIndex = 1;
        let activePatternIndex: number;
        let orgPatternOrder: EffluxPatternOrder;
        let orgPatterns: EffluxPattern[];

        beforeEach(() => {
            store.state.song.activeSong = song;
            song.order = [ 0, 1, 2 ];

            orgPatterns = [ ...song.patterns ];
            activePatternIndex = song.order[ activeOrderIndex ];
            orgPatternOrder = [ ...song.order ];

            // @ts-expect-error getters is readonly
            store.getters = {
                activeOrderIndex,
                activePatternIndex,
                amountOfSteps: song.patterns[ activePatternIndex ].steps,
                useOrders: false,
            };
        });

        it( "should insert the new pattern at the current pattern/order index position", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            patternAdd( store );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", [
                orgPatterns[ 0 ],
                orgPatterns[ 1 ],
                expect.any( Object ),
                orgPatterns[ 2 ],
            ]);
        });

        it( "should update the order list by appending the newly created pattern at the currently active order index while incrementing the indices of the patterns following in the pattern list", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            patternAdd( store );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", [ 0, 1, 2, 3 ]);
        });

        it( "should set the current order and pattern index to reflect the newly inserted pattern", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            patternAdd( store );
            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", activeOrderIndex + 1 );
        });

        it( "should restore the original values appropriately on undo", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            const { undo } = patternAdd( store );

            vi.restoreAllMocks();

            // spy as the song.patterns object will not have been updated due to the mocked commits
            const removeSpy = vi.spyOn( PatternUtil, "removePatternAtIndex" ).mockImplementation(() => orgPatterns )

            undo();

            expect( removeSpy ).toHaveBeenCalledWith( song.patterns, activePatternIndex + 1 );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", orgPatterns );
            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", orgPatternOrder );
            expect( commitSpy ).toHaveBeenCalledWith( "setActiveOrderIndex", activeOrderIndex );
            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", activePatternIndex );
        });

        describe( "and inserting at the end", () => {
            it( "should insert the new pattern at the end of the list", () => {
                const commitSpy = vi.spyOn( store, "commit" );
    
                patternAdd( store, true );
    
                expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", [
                    orgPatterns[ 0 ],
                    orgPatterns[ 1 ],
                    orgPatterns[ 2 ],
                    expect.any( Object ),
                ]);
            });

            it( "should update the order list by appending the newly created pattern at the end of the list", () => {
                const commitSpy = vi.spyOn( store, "commit" );
    
                patternAdd( store, true );
    
                expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", [ 0, 1, 2, 3 ]);
            });

            it( "should set the active pattern index to the last index in the order list", () => {
                const commitSpy = vi.spyOn( store, "commit" );
                const patternLength = song.patterns.length;
    
                patternAdd( store, true );
    
                expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", patternLength );
            });
        });
    });

    describe( "when use of pattern order is enabled", () => {
        const store = createMockStore();
        const activeOrderIndex = 2;
        let activePatternIndex: number;
        let orgPatternOrder: EffluxPatternOrder;
        let orgPatterns: EffluxPattern[];

        beforeEach(() => {
            song.order = [ 0, 1, 1, 2, 1 ];
            store.state.song.activeSong = song;

            orgPatterns = [ ...song.patterns ];
            activePatternIndex = song.order[ activeOrderIndex ];
            orgPatternOrder = [ ...song.order ];

            // @ts-expect-error getters is readonly
            store.getters = {
                activeOrderIndex,
                activePatternIndex,
                amountOfSteps: song.patterns[ activePatternIndex ].steps,
                useOrders: true,
            };
        });

        it( "should insert the new pattern at the end of the pattern list", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            patternAdd( store );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", [
                orgPatterns[ 0 ],
                orgPatterns[ 1 ],
                orgPatterns[ 2 ],
                expect.any( Object ),
            ]);
        });

        it( "should update the order list by appending the newly created pattern at the currently active order index", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            patternAdd( store );

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", [ 0, 1, 1, 3, 2, 1 ]);
        });

        it( "should set the current order and pattern indices to reflect the newly inserted pattern", () => {
            const commitSpy = vi.spyOn( store, "commit" );
            const patternAmount = song.patterns.length;

            patternAdd( store );

            expect( commitSpy ).toHaveBeenCalledWith( "setActiveOrderIndex", activeOrderIndex );
            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", patternAmount );
        });

        it( "should restore the original values appropriately on undo", () => {
            const commitSpy = vi.spyOn( store, "commit" );

            const { undo } = patternAdd( store );

            vi.restoreAllMocks();

            undo();

            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", orgPatterns );
            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", orgPatternOrder );
            expect( commitSpy ).toHaveBeenCalledWith( "setActiveOrderIndex", activeOrderIndex );
            expect( commitSpy ).toHaveBeenCalledWith( "setActivePatternIndex", activePatternIndex );
        });

        describe( "and inserting at the end", () => {
            it( "should update the order list by appending the newly created pattern at the end of the list", () => {
                const commitSpy = vi.spyOn( store, "commit" );
    
                patternAdd( store, true );
    
                expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", [ 0, 1, 1, 2, 1, 3 ]);
            });

            it( "should set the active order index to the last index in the order list", () => {
                const commitSpy = vi.spyOn( store, "commit" );
                const orderLength = song.order.length;
    
                patternAdd( store, true );
    
                expect( commitSpy ).toHaveBeenCalledWith( "setActiveOrderIndex", orderLength );
            });
        });
    });
});
