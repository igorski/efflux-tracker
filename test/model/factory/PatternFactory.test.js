/**
 * Created by igorzinken on 26-07-15.
 */
"use strict";

const chai             = require( "chai" );
const Config           = require( "../../../src/js/config/Config" );
const EventFactory     = require( "../../../src/js/model/factory/EventFactory" );
const PatternFactory   = require( "../../../src/js/model/factory/PatternFactory" );
const PatternValidator = require( "../../../src/js/model/validators/PatternValidator" );

describe( "PatternFactory", function()
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

    it( "should be able to generate a valid pattern", function()
    {
        const steps   = Math.round( 1 + ( Math.random() * 32 ));
        const pattern = PatternFactory.createEmptyPattern( steps );

        assert.ok( PatternValidator.isValid( pattern ),
            "expected PatternFactory to have generated a valid Pattern, but it didn't pass validation" );
    });

    it( "should be able to generate an empty pattern template for any requested step amount", function()
    {
        const steps   = Math.round( 1 + ( Math.random() * 32 ));
        const pattern = PatternFactory.createEmptyPattern( steps );

        assert.ok( typeof pattern === "object",
            "expected PatternFactory to have generated a pattern Object, got " + typeof pattern + " instead" );

        assert.strictEqual( steps, pattern.steps,
            "expected generated pattern to contain the requested amount of steps" );

        assert.strictEqual( Config.INSTRUMENT_AMOUNT, pattern.channels.length,
            "expected generated pattern to contain " + Config.INSTRUMENT_AMOUNT + " channels, got " + pattern.channels.length + " instead" );

        assert.strictEqual( steps, pattern.channels[ 0 ].length,
            "expected generated channel pattern list to be " + steps + " steps in length, got " + pattern.channels[ 0 ].length );

        assert.strictEqual( pattern.channels[ 0 ].length, pattern.channels[ 1 ].length,
            "expected generated channel pattern to be of equal length" );
    });

    it( "should by default generate an empty pattern template for a 16 step sequence", function()
    {
        const pattern = PatternFactory.createEmptyPattern();

        assert.strictEqual( 16, pattern.steps,
            "expected PatternFactory to have generated a pattern Object of 16 steps in length" );
    });

    it( "should be able to merge equal length patterns", function()
    {
        const pattern1 = PatternFactory.createEmptyPattern();
        const pattern2 = PatternFactory.createEmptyPattern();

        // generate some note content

        let p1channel1 = pattern1.channels[ 0 ];
        let p2channel1 = pattern2.channels[ 0 ];

        const expected1 = p1channel1[ 0 ] = EventFactory.createAudioEvent( 1, "C#", 4, 1 );
        const expected2 = p1channel1[ 4 ] = EventFactory.createAudioEvent( 1, "D",  5, 1 );
        const expected3 = p2channel1[ 2 ] = EventFactory.createAudioEvent( 1, "E",  6, 1 );
        const expected4 = p2channel1[ 6 ] = EventFactory.createAudioEvent( 1, "F",  7, 1 );

        // merge patterns

        PatternFactory.mergePatterns( pattern1, pattern2, 0 );

        // assert results

        p1channel1 = pattern1.channels[ 0 ];

        assert.strictEqual( expected1, p1channel1[ 0 ],
            "expected audio event at slot 0 to have merged with the expected step" );

        assert.strictEqual( expected2, p1channel1[ 4 ],
            "expected audio event at slot 0 to have merged with the expected step" );

        assert.strictEqual( expected3, p1channel1[ 2 ],
            "expected audio event at slot 0 to have merged with the expected step" );

        assert.strictEqual( expected4, p1channel1[ 6 ],
            "expected audio event at slot 0 to have merged with the expected step" );
    });

    it( "should be able to merge unequal length patterns when source is larger than target", function()
    {
        const pattern1 = PatternFactory.createEmptyPattern( 16 );
        const pattern2 = PatternFactory.createEmptyPattern( 32 );

        // generate some note content

        let p1channel1 = pattern1.channels[ 0 ];
        let p2channel1 = pattern2.channels[ 0 ];

        const expected1 = p1channel1[ 0 ]  = EventFactory.createAudioEvent( 1, "C#", 4, 1 );
        const expected2 = p1channel1[ 4 ]  = EventFactory.createAudioEvent( 1, "D",  5, 1 );
        const expected3 = p2channel1[ 15 ] = EventFactory.createAudioEvent( 1, "E",  6, 1 );
        const expected4 = p2channel1[ 29 ] = EventFactory.createAudioEvent( 1, "F",  7, 1 );

        // merge patterns

        PatternFactory.mergePatterns( pattern1, pattern2, 0 );

        // assert results

        p1channel1 = pattern1.channels[ 0 ];

        assert.strictEqual( expected1, p1channel1[ 0 ],
            "expected audio event at slot 0 to have remained equal after pattern size mutation" );

        assert.notStrictEqual( expected2, p1channel1[ 4 ],
            "expected audio event at slot 4 to have moved to slot 8 after pattern size mutation" );

        assert.strictEqual( expected2, p1channel1[ 8 ],
            "expected audio event at slot 4 to have moved to slot 8 after pattern size mutation" );

        assert.strictEqual( expected3, p1channel1[ 15 ],
            "expected audio event at slot 15 to have merged at the expected step" );

        assert.strictEqual( expected4, p1channel1[ 29 ],
            "expected audio event at slot 15 to have merged at the expected step" );
    });


    it( "should be able to merge unequal length patterns when target is larger than the source", function()
    {
        const pattern1 = PatternFactory.createEmptyPattern( 32 );
        const pattern2 = PatternFactory.createEmptyPattern( 16 );

        // generate some note content

        let p1channel1 = pattern1.channels[ 0 ];
        let p2channel1 = pattern2.channels[ 0 ];

        const expected1 = p1channel1[ 15 ] = EventFactory.createAudioEvent( 1, "E",  6, 1 );
        const expected2 = p1channel1[ 29 ] = EventFactory.createAudioEvent( 1, "F",  7, 1 );
        const expected3 = p2channel1[ 0 ]  = EventFactory.createAudioEvent( 1, "C#", 4, 1 );
        const expected4 = p2channel1[ 4 ]  = EventFactory.createAudioEvent( 1, "D",  5, 1 );

        // merge patterns

        PatternFactory.mergePatterns( pattern1, pattern2, 0 );

        // assert results

        p1channel1 = pattern1.channels[ 0 ];

        assert.strictEqual( expected1, p1channel1[ 15 ],
            "expected audio event at slot 15 to have merged at the expected step" );

        assert.strictEqual( expected2, p1channel1[ 29 ],
            "expected audio event at slot 29 to have merged at the expected step" );

        assert.strictEqual( expected3, p1channel1[ 0 ],
            "expected audio event at slot 0 to have merged at the expected step after pattern size mutation" );

        assert.strictEqual( expected4, p1channel1[ 8 ],
            "expected audio event at slot 8 to have merged at the expected step after pattern size mutation" );
    });

    it( "should be able to clear the AudioEvent content for any requested step position", function()
    {
        const pattern = PatternFactory.createEmptyPattern();

        // generate some note content

        const pchannel1 = pattern.channels[ 0 ];
        const pchannel2 = pattern.channels[ 1 ];

        // create some AudioEvents

        const expected1 = pchannel1[ 0 ] = EventFactory.createAudioEvent( 1, "E", 2, 1 );
        const expected2 = pchannel1[ 1 ] = EventFactory.createAudioEvent( 1, "F", 3, 1 );
        const expected3 = pchannel2[ 0 ] = EventFactory.createAudioEvent( 1, "F#",4, 1 );
        const expected4 = pchannel2[ 1 ] = EventFactory.createAudioEvent( 1, "G", 5, 1 );

        // start clearing individual events and asserting the results

        PatternFactory.clearEvent( pattern, 0, 0 );

        assert.notStrictEqual( expected1, pchannel1[ 0 ]);

        PatternFactory.clearEvent( pattern, 1, 0 );

        assert.notStrictEqual( expected3, pchannel2[ 0 ]);

        // assert remaining events are still existent

        assert.strictEqual( expected2, pchannel1[ 1 ]);
        assert.strictEqual( expected4, pchannel2[ 1 ]);
    });
});
