"use strict";

const NumberUtil = require( "../../src/js/utils/NumberUtil" );
const chai = require( "chai" );

describe( "NumberUtil", function()
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // executed before the tests start running

    before( function()
    {

    });

    // executed when all tests have finished running

    after( function()
    {

    });

    // executed before each individual test

    beforeEach( function()
    {

    });

    // executed after each individual test

    afterEach( function()
    {

    });

    /* actual unit tests */

    it( "should be able to convert hexadecimal values into floating point values in the 0 - 100 range", () => {
        let input = "ff";
        let expected = 100;

        assert.strictEqual( expected, NumberUtil.fromHex( input ));

        input = "aa";
        expected = 66.66666666666667;

        assert.strictEqual( expected, NumberUtil.fromHex( input ));

        input = "00";
        expected = 0;

        assert.strictEqual( expected, NumberUtil.fromHex( input ));
    });

    it( "should be able to convert floating point values in the 0 - 100 range to hexadecimal values", () => {
        let input = 100;
        let expected = "ff";

        assert.strictEqual( expected, NumberUtil.toHex( input ));

        input = 66.66666666666667;
        expected = "aa";

        assert.strictEqual( expected, NumberUtil.toHex( input ));

        input = 50;
        expected = "7f";

        assert.strictEqual( expected, NumberUtil.toHex( input ));

        input = 0;
        expected = "00";

        assert.strictEqual( expected, NumberUtil.toHex( input ));
    });
});
