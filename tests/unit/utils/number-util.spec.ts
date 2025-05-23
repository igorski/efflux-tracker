import { describe, it, expect } from "vitest";
import { fromHex, toHex, isHex, roundToNearest } from "@/utils/number-util";

describe( "NumberUtil", () => {
    /* actual unit tests */

    it( "should be able to convert hexadecimal values into floating point values in the 0 - 100 range", () => {
        let input = "ff";
        let expected = 100;

        expect( expected ).toEqual( fromHex( input ));

        input = "aa";
        expected = 66.66666666666667;

        expect( expected ).toEqual( fromHex( input ));

        input = "00";
        expected = 0;

        expect( expected ).toEqual( fromHex( input ));
    });

    it( "should be able to convert floating point values in the 0 - 100 range to hexadecimal values", () => {
        let input = 100;
        let expected = "ff";

        expect( expected ).toEqual( toHex( input ));

        input = 66.66666666666667;
        expected = "aa";

        expect( expected ).toEqual( toHex( input ));

        input = 50;
        expected = "7f";

        expect( expected ).toEqual( toHex( input ));

        input = 0;
        expected = "00";

        expect( expected ).toEqual( toHex( input ));
    });

    it( "should be able to identify valid hexadecimal values", () => {
        // invalid hex should return false
        expect( isHex( "FG" )).toBe( false );
        expect( isHex( "0x64" )).toBe( false );

        // 0 - 9 values
        expect( isHex( "0" )).toBe( true );
        expect( isHex( "00" )).toBe( true );

        // upper/lower case
        expect( isHex( "ff" )).toBe( true );
        expect( isHex( "FF" )).toBe( true );
    });

    it( "should be able to round a value to the nearest neighbour of the provided multiple", () => {
        expect( roundToNearest( 0, 2 )).toEqual( 0 );
        expect( roundToNearest( 1, 2 )).toEqual( 0 );
        expect( roundToNearest( 1.1, 2 )).toEqual( 2 );
        expect( roundToNearest( 1.7, 2 )).toEqual( 2 );
        expect( roundToNearest( 2.1, 2 )).toEqual( 2 );
        expect( roundToNearest( 3, 2 )).toEqual( 2 );
        expect( roundToNearest( 3.5, 2 )).toEqual( 4 );
        expect( roundToNearest( 4.1, 2 )).toEqual( 4 );
        expect( roundToNearest( 5.1, 2 )).toEqual( 6 );
    });
});
