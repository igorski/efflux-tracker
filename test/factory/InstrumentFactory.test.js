/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai              = require( "chai" );
const InstrumentFactory = require( "../../src/js/factory/InstrumentFactory" );

describe( "InstrumentFactory", function()
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

    it( "should be able to retrieve an existing WaveTable for an oscillator", function()
    {
        const oscillator = InstrumentFactory.createOscillator();
        const table      = oscillator.table = [];

        assert.strictEqual( table, InstrumentFactory.getTableForOscillator( oscillator ),
            "expected InstrumentFactory to have returned set WaveTable unchanged" );
    });

    it( "should be able to lazily create a WaveTable for an oscillator", function()
    {
        const oscillator = InstrumentFactory.createOscillator();
        const table      = InstrumentFactory.getTableForOscillator( oscillator );

        assert.ok( table instanceof Array,
            "expected InstrumentFactory to have generated a WaveTable unchanged" );

        let i = table.length;
        while ( i-- )
            assert.strictEqual( 0, table[ i ], "expected generated WaveTable to contain silence" );
    });

    it( "should be able to generate a WaveTable for an oscillator at any given size", function()
    {
        const oscillator = InstrumentFactory.createOscillator();
        const size       = Math.round( Math.random() * 500 ) + 1;
        const table      = InstrumentFactory.getTableForOscillator( oscillator, size );

        assert.strictEqual( size, table.length,
            "expected InstrumentFactory to have generated a WaveTable of requested size" );
    });
});
