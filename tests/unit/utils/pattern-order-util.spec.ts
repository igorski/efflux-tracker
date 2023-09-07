import { describe, it, expect } from "vitest";
import PatternOrderUtil from "@/utils/pattern-order-util";

describe( "PatternOrderUtil", () => {
    it( "should be able to return a new order list without containing the pattern at the specified index", () => {
        const order = [ 1, 1, 3, 3, 2 ];
        expect( PatternOrderUtil.removePatternAtIndex( order, 2 )).toEqual([ 1, 1, 3, 2 ]);
    });

    it( "should be able to return a new order list without containing any reference to the specified pattern number", () => {
        const order = [ 1, 1, 3, 3, 2 ];
        expect( PatternOrderUtil.removeAllPatternInstances( order, 3 )).toEqual([ 1, 1, 2 ]);
    });
});
