/**
 * Created by igorzinken on 26-07-15.
 */
var chai              = require( "chai" );
var InstrumentFactory = require( "../../src/js/factory/InstrumentFactory" );

describe( "InstrumentFactory", function()
{
    /* setup */

    // use Chai assertion library
    var assert = chai.assert,
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
        var oscillator = InstrumentFactory.createOscillator();
        var table      = oscillator.table = [];

        assert.strictEqual( table, InstrumentFactory.getTableForOscillator( oscillator ),
            "expected InstrumentFactory to have returned set WaveTable unchanged" );
    });

    it( "should be able to lazily create a WaveTable for an oscillator", function()
    {
        var oscillator = InstrumentFactory.createOscillator();
        var table      = InstrumentFactory.getTableForOscillator( oscillator );

        assert.ok( table instanceof Array,
            "expected InstrumentFactory to have generated a WaveTable unchanged" );

        var i = table.length;
        while ( i-- )
            assert.strictEqual( 0, table[ i ], "expected generated WaveTable to contain silence" );
    });

    it( "should be able to generate a WaveTable for an oscillator at any given size", function()
    {
        var oscillator = InstrumentFactory.createOscillator();
        var size       = Math.round( Math.random() * 500 ) + 1;
        var table      = InstrumentFactory.getTableForOscillator( oscillator, size );

        assert.strictEqual( size, table.length,
            "expected InstrumentFactory to have generated a WaveTable of requested size" );
    });
});
