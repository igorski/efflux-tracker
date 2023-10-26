import { describe, vi, it, expect, beforeEach, afterEach } from "vitest";
import PatternPasteMultiple from "@/model/actions/pattern-paste-multiple";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";
import type { EffluxPattern } from "@/model/types/pattern";
import type { EffluxPatternOrder } from "@/model/types/pattern-order";
import type { EffluxSong } from "@/model/types/song";
import { createMockStore } from "../../mocks";

describe( "Pattern paste (multiple) action", () => {
    const store = createMockStore();
    const activeOrderIndex = 1;
    let activePatternIndex: number;
    let orgPatternOrder: EffluxPatternOrder;
    let orgPatterns: EffluxPattern[];
    let patternsToPaste: EffluxPattern[];
    let song: EffluxSong;
    
    beforeEach(() => {
        song = SongFactory.create();
        store.state.song.activeSong = song;

        song.patterns = [
            PatternFactory.create( 16 ),
            PatternFactory.create( 8 ),
            PatternFactory.create( 32 ),
        ];

        song.order = [ 0, 1, 2 ]; // useOrders (@see settings-module) not supported for advanced pattern editor
        orgPatterns = [ ...song.patterns ];
        orgPatternOrder = [ ...song.order ];
        activePatternIndex = song.order[ activeOrderIndex ];

        // @ts-expect-error getters is readonly
        store.getters = {
            activeSong: song,
            activePatternIndex,
            activeOrderIndex,
        };

        patternsToPaste = [
            PatternFactory.create( 16 ),
            PatternFactory.create( 16 ),
        ];
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it( "should insert the new patterns after the currently active pattern index, when no pattern index was provided", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        PatternPasteMultiple( store, patternsToPaste );

        expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", [
            orgPatterns[ 0 ],
            patternsToPaste[ 0 ],
            patternsToPaste[ 1 ],
            orgPatterns[ 1 ],
            orgPatterns[ 2 ],
        ]);
    });

    it( "should insert the new patterns after given pattern index, when provided", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        PatternPasteMultiple( store, patternsToPaste, 2 );

        expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", [
            orgPatterns[ 0 ],
            orgPatterns[ 1 ],
            patternsToPaste[ 0 ],
            patternsToPaste[ 1 ],
            orgPatterns[ 2 ],
        ]);
    });

    it( "should keep the order list in sync with the pattern list", () => {
        const commitSpy = vi.spyOn( store, "commit" ).mockImplementation(( fn, args ) => {
            if ( fn === "replacePatterns" ) {
                song.patterns = args;
            }
        });

        PatternPasteMultiple( store, patternsToPaste );

        expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", [ 0, 1, 2, 3, 4 ]);
    });

    it( "should invalidate the sequencer channel cache", () => {
        const commitSpy = vi.spyOn( store, "commit" );

        PatternPasteMultiple( store, patternsToPaste );

        expect( commitSpy ).toHaveBeenCalledWith( "invalidateChannelCache", { song });
    });

    describe( "when undo-ing the changes", () => {
        it( "should restore the original values appropriately", () => {
            const commitSpy = vi.spyOn( store, "commit" );
    
            const { undo } = PatternPasteMultiple( store, patternsToPaste );
    
            vi.restoreAllMocks();
    
            undo();
    
            expect( commitSpy ).toHaveBeenCalledWith( "replacePatterns", orgPatterns );
            expect( commitSpy ).toHaveBeenCalledWith( "replacePatternOrder", orgPatternOrder );
        });
    
        it( "should set the active order index to the end of the order list if the index is out of bounds", () => {
            const commitSpy = vi.spyOn( store, "commit" );
    
            const { undo } = PatternPasteMultiple( store, patternsToPaste );
    
            vi.restoreAllMocks();
    
            store.getters.activeOrderIndex = orgPatternOrder.length;
            undo();
    
            expect( commitSpy ).toHaveBeenCalledWith( "gotoPattern", { orderIndex: orgPatternOrder.length - 1, song });
        });
    });
});
