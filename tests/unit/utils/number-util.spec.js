import NumberUtil from '../../../src/utils/number-util';

describe( 'NumberUtil', () => {
    /* actual unit tests */

    it( 'should be able to convert hexadecimal values into floating point values in the 0 - 100 range', () => {
        let input = 'ff';
        let expected = 100;

        expect(expected).toEqual(NumberUtil.fromHex( input ));

        input = 'aa';
        expected = 66.66666666666667;

        expect(expected).toEqual(NumberUtil.fromHex( input ));

        input = '00';
        expected = 0;

        expect(expected).toEqual(NumberUtil.fromHex( input ));
    });

    it( 'should be able to convert floating point values in the 0 - 100 range to hexadecimal values', () => {
        let input = 100;
        let expected = 'ff';

        expect(expected).toEqual(NumberUtil.toHex( input ));

        input = 66.66666666666667;
        expected = 'aa';

        expect(expected).toEqual(NumberUtil.toHex( input ));

        input = 50;
        expected = '7f';

        expect(expected).toEqual(NumberUtil.toHex( input ));

        input = 0;
        expected = '00';

        expect(expected).toEqual(NumberUtil.toHex( input ));
    });

    it( 'should be able to identify valid hexadecimal values', () => {
        // non numerical values should return false
        expect(NumberUtil.isHex( 0 )).toBe(false);
        expect(NumberUtil.isHex( 255 )).toBe(false);

        // invalid hex should return false
        expect(NumberUtil.isHex( 'FG' )).toBe(false);
        expect(NumberUtil.isHex( '0x64' )).toBe(false);

        // 0 - 9 values
        expect(NumberUtil.isHex( '0' )).toBe(true);
        expect(NumberUtil.isHex( '00' )).toBe(true);

        // upper/lower case
        expect(NumberUtil.isHex( 'ff' )).toBe(true);
        expect(NumberUtil.isHex( 'FF' )).toBe(true);
    });
});
