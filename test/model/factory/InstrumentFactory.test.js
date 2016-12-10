/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai                = require( "chai" );
const InstrumentFactory   = require( "../../../src/js/model/factory/InstrumentFactory" );
const InstrumentValidator = require( "../../../src/js/model/validators/InstrumentValidator" );

describe( "InstrumentFactory", () =>
{
    /* setup */

    // use Chai assertion library
    const assert = chai.assert,
          expect = chai.expect;

    // executed before the tests start running

    before( () =>
    {

    });

    // executed when all tests have finished running

    after( () =>
    {

    });

    // executed before each individual test

    beforeEach( () =>
    {

    });

    // executed after each individual test

    afterEach( () =>
    {

    });

    /* actual unit tests */

    it( "should be able to create a valid Instrument", () =>
    {
        const instrument = InstrumentFactory.createInstrument( 0, "foo" );

        assert.ok( InstrumentValidator.isValid( instrument ),
            "expected InstrumentFactory to have generated a valid instrument, but it didn't pass validation" );
    });

    it( "should be able to retrieve an existing WaveTable for an oscillator", () =>
    {
        const oscillator = InstrumentFactory.createOscillator();
        const table      = oscillator.table = [];

        assert.strictEqual( table, InstrumentFactory.getTableForOscillator( oscillator ),
            "expected InstrumentFactory to have returned set WaveTable unchanged" );
    });

    it( "should be able to lazily create a WaveTable for an oscillator", () =>
    {
        const oscillator = InstrumentFactory.createOscillator();
        const table      = InstrumentFactory.getTableForOscillator( oscillator );

        assert.ok( table instanceof Array,
            "expected InstrumentFactory to have generated a WaveTable unchanged" );

        let i = table.length;
        while ( i-- )
            assert.strictEqual( 0, table[ i ], "expected generated WaveTable to contain silence" );
    });

    it( "should be able to generate a WaveTable for an oscillator at any given size", () =>
    {
        const oscillator = InstrumentFactory.createOscillator();
        const size       = Math.round( Math.random() * 500 ) + 1;
        const table      = InstrumentFactory.getTableForOscillator( oscillator, size );

        assert.strictEqual( size, table.length,
            "expected InstrumentFactory to have generated a WaveTable of requested size" );
    });

    it( "should add the pitch envelope section to legacy instruments", () =>
    {
        const instrument = InstrumentFactory.createInstrument( 0, "foo" );

        // ensure no pitch envelopes exist

        instrument.oscillators.forEach(( oscillator ) => {
            delete oscillator.pitch;
        });

        const clonedInstrument = InstrumentFactory.loadPreset( instrument, 1, "bar" );

        clonedInstrument.oscillators.forEach(( oscillator ) => {
            assert.ok( typeof oscillator.pitch === "object",
                "expected Oscillator to contain pitch envelope" );
        });
    });
});
