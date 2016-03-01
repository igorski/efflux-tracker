/**
 * Created by igorzinken on 26-07-15.
 */
var chai = require( "chai" );
var PatternFactory = require( "../../src/js/factories/PatternFactory" );

describe( "PatternFactory", function()
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

    it( "should be able to generate an empty pattern template for any requested step size", function()
    {
        var steps   = Math.round( 1 + ( Math.random() * 32 ));
        var pattern = PatternFactory.createEmptyPattern( steps );

        assert.ok( typeof pattern === "object",
            "expected PatternFactory to have generated a pattern Object, got " + typeof pattern + " instead" );

        assert.strictEqual( steps, pattern.steps,
            "expected generated pattern to contain the requested amount of steps" );

        assert.strictEqual( 2, pattern.channels.length,
            "expected generated pattern to contain 2 channels, got " + pattern.channels.length + " instead" );

        assert.strictEqual( steps, pattern.channels[ 0 ].length,
            "expected generated channel pattern list to be " + steps + " steps in length, got " + pattern.channels[ 0 ].length );

        assert.strictEqual( pattern.channels[ 0 ].length, pattern.channels[ 1 ].length,
            "expected generated channel pattern to be of equal length" );
    });

    it( "should by default generate an empty pattern template for a 16 step sequence", function()
    {
        var pattern = PatternFactory.createEmptyPattern();

        assert.strictEqual( 16, pattern.steps,
            "expected PatternFactory to have generated a pattern Object of 16 steps in length" );
    });

    it( "should be able to merge equal length patterns", function()
    {
        var pattern1 = PatternFactory.createEmptyPattern();
        var pattern2 = PatternFactory.createEmptyPattern();

        // generate some note content

        var p1channel1 = pattern1.channels[ 0 ];
        var p2channel1 = pattern2.channels[ 0 ];

        var expected1 = p1channel1[ 0 ] = { sound: 4, note: "C#", octave: 4, accent: false };
        var expected2 = p1channel1[ 4 ] = { sound: 4, note: "D",  octave: 5, accent: false };
        var expected3 = p2channel1[ 2 ] = { sound: 4, note: "E",  octave: 6, accent: false };
        var expected4 = p2channel1[ 6 ] = { sound: 4, note: "F",  octave: 7, accent: false };

        // merge patterns

        PatternFactory.mergePatterns( pattern1, pattern2 );

        // assert results

        p1channel1 = pattern1.channels[ 0 ];

        assert.strictEqual( expected1, p1channel1[ 0 ],
            "expected step content at slot 0 to have merged with the expected step" );

        assert.strictEqual( expected2, p1channel1[ 4 ],
            "expected step content at slot 0 to have merged with the expected step" );

        assert.strictEqual( expected3, p1channel1[ 2 ],
            "expected step content at slot 0 to have merged with the expected step" );

        assert.strictEqual( expected4, p1channel1[ 6 ],
            "expected step content at slot 0 to have merged with the expected step" );
    });

    it( "should be able to merge unequal length patterns when source is larger than target", function()
    {
        var pattern1 = PatternFactory.createEmptyPattern( 16 );
        var pattern2 = PatternFactory.createEmptyPattern( 32 );

        // generate some note content

        var p1channel1 = pattern1.channels[ 0 ];
        var p2channel1 = pattern2.channels[ 0 ];

        var expected1 = p1channel1[ 0 ]  = { sound: 4, note: "C#", octave: 4, accent: false };
        var expected2 = p1channel1[ 4 ]  = { sound: 4, note: "D",  octave: 5, accent: false };
        var expected3 = p2channel1[ 15 ] = { sound: 4, note: "E",  octave: 6, accent: false };
        var expected4 = p2channel1[ 29 ] = { sound: 4, note: "F",  octave: 7, accent: false };

        // merge patterns

        PatternFactory.mergePatterns( pattern1, pattern2 );

        // assert results

        p1channel1 = pattern1.channels[ 0 ];

        assert.strictEqual( expected1, p1channel1[ 0 ],
            "expected step content at slot 0 to have remained equal after pattern size mutation" );

        assert.notStrictEqual( expected2, p1channel1[ 4 ],
            "expected step content at slot 4 to have moved to slot 8 after pattern size mutation" );

        assert.strictEqual( expected2, p1channel1[ 8 ],
            "expected step content at slot 4 to have moved to slot 8 after pattern size mutation" );

        assert.strictEqual( expected3, p1channel1[ 15 ],
            "expected step content at slot 15 to have merged at the expected step" );

        assert.strictEqual( expected4, p1channel1[ 29 ],
            "expected step content at slot 15 to have merged at the expected step" );
    });


    it( "should be able to merge unequal length patterns when target is larger than the source", function()
    {
        var pattern1 = PatternFactory.createEmptyPattern( 32 );
        var pattern2 = PatternFactory.createEmptyPattern( 16 );

        // generate some note content

        var p1channel1 = pattern1.channels[ 0 ];
        var p2channel1 = pattern2.channels[ 0 ];

        var expected1 = p1channel1[ 15 ] = { sound: 4, note: "E",  octave: 6, accent: false };
        var expected2 = p1channel1[ 29 ] = { sound: 4, note: "F",  octave: 7, accent: false };
        var expected3 = p2channel1[ 0 ]  = { sound: 4, note: "C#", octave: 4, accent: false };
        var expected4 = p2channel1[ 4 ]  = { sound: 4, note: "D",  octave: 5, accent: false };

        // merge patterns

        PatternFactory.mergePatterns( pattern1, pattern2 );

        // assert results

        p1channel1 = pattern1.channels[ 0 ];

        assert.strictEqual( expected1, p1channel1[ 15 ],
            "expected step content at slot 15 to have merged at the expected step" );

        assert.strictEqual( expected2, p1channel1[ 29 ],
            "expected step content at slot 29 to have merged at the expected step" );

        assert.strictEqual( expected3, p1channel1[ 0 ],
            "expected step content at slot 0 to have merged at the expected step after pattern size mutation" );

        assert.strictEqual( expected4, p1channel1[ 8 ],
            "expected step content at slot 8 to have merged at the expected step after pattern size mutation" );
    });

    it( "should be able to clear the content for any request step", function()
    {
        var pattern = PatternFactory.createEmptyPattern();

        // generate some note content

        var pchannel1 = pattern.channels[ 0 ];
        var pchannel2 = pattern.channels[ 1 ];

        var expected1 = pchannel1[ 0 ] = { sound: 4, note: "E",  octave: 2, accent: false };
        var expected2 = pchannel1[ 1 ] = { sound: 4, note: "F",  octave: 3, accent: false };
        var expected3 = pchannel2[ 0 ] = { sound: 4, note: "F#", octave: 4, accent: false };
        var expected4 = pchannel2[ 1 ] = { sound: 4, note: "G",  octave: 5, accent: false };

        // start clearing individual steps and asserting the results

        PatternFactory.clearStep( pattern, 0, 0 );

        assert.notStrictEqual( expected1, pchannel1[ 0 ]);

        PatternFactory.clearStep( pattern, 1, 0 );

        assert.notStrictEqual( expected3, pchannel2[ 0 ]);

        // assert remaining steps are still existent

        assert.strictEqual( expected2, pchannel1[ 1 ]);
        assert.strictEqual( expected4, pchannel2[ 1 ]);
    });
});
