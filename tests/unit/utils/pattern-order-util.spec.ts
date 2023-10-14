import { describe, it, expect } from "vitest";
import PatternOrderUtil, { convertLegacy } from "@/utils/pattern-order-util";
import EventFactory from "@/model/factories/event-factory";
import PatternFactory from "@/model/factories/pattern-factory";
import SongFactory from "@/model/factories/song-factory";

describe( "PatternOrderUtil", () => {
    it( "should be able to return a new order list containing given pattern at specified index", () => {
        const order = [ 1, 1, 3, 3, 2 ];
        expect( PatternOrderUtil.addPatternAtIndex( order, 2, 4 )).toEqual([ 1, 1, 4, 3, 3, 2 ]);
    });

    it( "should be able to return a new order list without containing the pattern at the specified index", () => {
        const order = [ 1, 1, 3, 3, 2 ];
        expect( PatternOrderUtil.removePatternAtIndex( order, 2 )).toEqual([ 1, 1, 3, 2 ]);
    });

    it( "should be able to return a new order list without containing any reference to the specified pattern number", () => {
        const order = [ 1, 1, 3, 3, 2 ];
        expect( PatternOrderUtil.removeAllPatternInstances( order, 3 )).toEqual([ 1, 1, 2 ]);
    });

    it( "should be able to convert a legacy song to use patterns, deduplicating the existing content", () => {
        let song   = SongFactory.create();
        song.order = []; // mimic legacy song

        const pattern1events = [
            EventFactory.create( 1, "C", 3 ),
            EventFactory.create( 1, "D", 3 ),
        ];
        const pattern2events = [
            EventFactory.create( 2, "D", 3 ),
            EventFactory.create( 1, "D", 3 ),
        ];
        // same signature as first pattern
        const pattern3events = [
            EventFactory.create( 1, "C", 3 ),
            EventFactory.create( 1, "D", 3 ),
        ];
        const orgPatterns = [
            PatternFactory.create( 2, [ pattern1events ]),
            PatternFactory.create( 2, [ pattern2events ]),
            PatternFactory.create( 2, [ pattern3events ]),
        ];

        song.patterns = [ ...orgPatterns ];
        song = convertLegacy( song );

        expect( song.order ).toEqual([ 0, 1, 0 ]);
        expect( song.patterns ).toEqual([ orgPatterns[ 0 ], orgPatterns[ 1 ]]);
    });
});
