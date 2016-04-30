/**
 * Created by igorzinken on 26-07-15.
 */
var PatternUtil    = require( "../../src/js/utils/PatternUtil" );
var EventFactory   = require( "../../src/js/factory/EventFactory" );
var PatternFactory = require( "../../src/js/factory/PatternFactory" );
var chai           = require( "chai" );

describe( "PatternUtil", function()
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

    it( "should be able to add a new pattern at the given insertion index", function()
    {
        var amount   = 10,
            steps    = 16,
            patterns = new Array( amount ),
            temp     = new Array( amount );

        for ( var i = 0; i < amount; ++i )
            patterns[ i ] = temp[ i ] = PatternFactory.createEmptyPattern( steps );

        var insertion = 5;
        patterns = PatternUtil.addEmptyPatternAtIndex( patterns, insertion, steps );

        assert.ok( amount + 1, patterns.length,
            "expected pattern list to have expanded in size" );

        assert.strictEqual( temp[ insertion - 1 ], patterns[ insertion - 1 ],
            "expected the last pattern prior to the insertion to equal the original one" );

        assert.strictEqual( temp[ insertion ], patterns[ insertion + 1 ],
            "expected the first pattern after the insertion to equal the original one at the insertion offset" );

        assert.ok( temp.indexOf( patterns[ insertion ] === -1 ),
            "expected the content inserted at the insertion point not to be present in the original list" );
    });

    it( "should update the start indices of all events present in the patterns after the insertion point", function()
    {
        var amount   = 3,
            steps    = 16,
            patterns = new Array( amount),
            i;

        for ( i = 0; i < amount; ++i )
            patterns[ i ] = PatternFactory.createEmptyPattern( steps );

        // generate some events

        var insertion = 1;

        var event1 = EventFactory.createAudioEvent();
        var event2 = EventFactory.createAudioEvent();

        event1.seq.startMeasure = 0;
        event1.seq.endMeasure   = 0;
        event2.seq.startMeasure = insertion + 1;
        event2.seq.endMeasure   = insertion + 1;

        patterns[ 0 ].channels[ 0 ][ 0 ]             = event1;
        patterns[ insertion + 1 ].channels[ 0 ][ 0 ] = event2;

        PatternUtil.addEmptyPatternAtIndex( patterns, insertion, steps );

        assert.strictEqual( 0, event1.seq.startMeasure,
            "expected event 1 start measure to have remained unchanged as it was present before the insertion point" );

        assert.strictEqual( 0, event1.seq.endMeasure,
            "expected event 1 end measure to have remained unchanged as it was present before the insertion point" );

        assert.strictEqual( insertion + 2, event2.seq.startMeasure,
            "expected event 2 start measure to have incremented as it was present after the insertion point" );

        assert.strictEqual( insertion + 2, event2.seq.endMeasure,
            "expected event 2 end measure to have incremented as it was present after the insertion point" );
    });

    it( "should be able to add a new pattern with a unique amount of steps different to the existing pattern step amounts", function()
    {
        var amount   = 10,
            steps    = 16,
            patterns = new Array( amount),
            newSteps = 32,
            insertion = 5, i;

        for ( i = 0; i < amount; ++i )
            patterns[ i ] = PatternFactory.createEmptyPattern( steps );

        patterns = PatternUtil.addEmptyPatternAtIndex( patterns, insertion, newSteps );

        for ( i = 0; i < ( amount + 1 ); ++i )
        {
            if ( i !== insertion ) {
                assert.strictEqual( steps, patterns[ i ].steps,
                    "expected original pattern step amount not to have changed after insertion" );
            }
            else {
                assert.strictEqual( newSteps, patterns[ i ].steps,
                    "expected newly created pattern to have the requested amount of steps" );
            }
        }
    });

    it( "should be able to remove a pattern from the given deletion index", function()
    {
        var amount   = 10,
            patterns = new Array( amount ),
            temp     = new Array( amount );

        for ( var i = 0; i < amount; ++i )
            patterns[ i ] = temp[ i ] = PatternFactory.createEmptyPattern( 16 );

        var deletion = 5;
        patterns = PatternUtil.removePatternAtIndex( patterns, deletion );

        assert.ok( amount - 1, patterns.length,
            "expected pattern list to have contracted in size" );

        assert.strictEqual( temp[ deletion - 1 ], patterns[ deletion - 1 ],
            "expected the last pattern prior to the removal to equal the original one" );

        assert.strictEqual( temp[ deletion + 1 ], patterns[ deletion ],
            "expected the first pattern after the removal to equal the original one at the deletion index" );
    });

    it( "should update the start indices of all events present in the patterns after the deletion index", function()
    {
        var amount   = 3,
            patterns = new Array( amount),
            i;

        for ( i = 0; i < amount; ++i )
            patterns[ i ] = PatternFactory.createEmptyPattern( 16 );

        // generate some events

        var deletion = 1;

        var event1 = EventFactory.createAudioEvent();
        var event2 = EventFactory.createAudioEvent();

        event1.seq.startMeasure = 0;
        event1.seq.endMeasure   = 0;
        event2.seq.startMeasure = deletion + 1;
        event2.seq.endMeasure   = deletion + 1;

        patterns[ 0 ].channels[ 0 ][ 0 ]            = event1;
        patterns[ deletion + 1 ].channels[ 0 ][ 0 ] = event2;

        PatternUtil.removePatternAtIndex( patterns, deletion );

        assert.strictEqual( 0, event1.seq.startMeasure,
            "expected event 1 start measure to have remained unchanged as it was present before the removal point" );

        assert.strictEqual( 0, event1.seq.endMeasure,
            "expected event 1 end measure to have remained unchanged as it was present before the removal point" );

        assert.strictEqual( deletion, event2.seq.startMeasure,
            "expected event 2 start measure to have decremented as it was present after the removal point" );

        assert.strictEqual( deletion, event2.seq.endMeasure,
            "expected event 2 end measure to have decremented as it was present after the removal point" );
    });
});
