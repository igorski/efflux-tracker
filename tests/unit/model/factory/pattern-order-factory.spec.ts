import { describe, it, expect } from "vitest";
import PatternFactory from "@/model/factories/pattern-factory";
import PatternOrderFactory from "@/model/factories/pattern-order-factory";
import { serialize } from "@/model/serializers/pattern-order-serializer";
import { serialize as serializePatterns } from "@/model/serializers/pattern-serializer";
import { ASSEMBLER_VERSION } from "@/services/song-assembly-service";

describe( "PatternOrderFactory", () => {
    describe( "serialization", () => {
        it( "should be able to deserialize a pattern order without loss of data", () => {
            const order = [ 0, 0, 1, 1, 2 ];
            const xtk = {};

            serialize( xtk, order );
            expect( PatternOrderFactory.deserialize( xtk, ASSEMBLER_VERSION )).toEqual( order );
        });

        it( "should be able to deserialize a pattern from legacy songs created before orders were supported", () => {
            const pattern1 = PatternFactory.create( 16 );
            const pattern2 = PatternFactory.create( 32 );
    
            const patterns = [ pattern1, pattern2 ];
            const xtk = {};

            serializePatterns( xtk, patterns );
            expect( PatternOrderFactory.deserialize( xtk, 7 )).toEqual([ 0, 1 ]);
        });
    });
});
