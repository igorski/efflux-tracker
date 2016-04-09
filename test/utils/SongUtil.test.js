/**
 * Created by igorzinken on 26-07-15.
 */
var chai           = require( "chai" );
var MockBrowser    = require( "mock-browser" ).mocks.MockBrowser;
var SongModel      = require( "../../src/js/model/SongModel" );
var PatternFactory = require( "../../src/js/factory/PatternFactory" );
var SongUtil       = require( "../../src/js/utils/SongUtil" );

describe( "SongUtil", function()
{
    /* setup */

    // use Chai assertion library
    var assert = chai.assert,
        expect = chai.expect;

    // executed before the tests start running

    before( function()
    {
        browser       = new MockBrowser();
        global.window = browser.getWindow();
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

    it( "should know whether or not a song has content", function()
    {
        var model = new SongModel();
        var song  = model.createSong();

        assert.notOk( SongUtil.hasContent( song ),
            "expected song not to have content as no notes were defined in any pattern" );

        // add a note to the first available slot in the firs
        // available channel of the first available pattern

        var firstEvent  = PatternFactory.generateEmptyAudioEvent();
        firstEvent.note = "C#";
        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;

        assert.ok( SongUtil.hasContent( song ),
            "expected song to have content after a note was defined in the first pattern" );
    });

    it( "should be able to update existing Audio Event offsets recursively", function()
    {
        var model = new SongModel();
        var song  = model.createSong();

        // generate a random multiplication ratio

        var ratio = Math.random();

        // add some extra channels

        song.patterns.push( PatternFactory.createEmptyPattern( 16 ));

        // generate some events

        var firstEvent  = PatternFactory.generateEmptyAudioEvent();
        firstEvent.note = "C#";
        firstEvent.seq.startMeasureOffset = 10;
        firstEvent.seq.length             = 2.5;

        var expectedOffset1 = firstEvent.seq.startMeasureOffset * ratio;
        var expectedLength1 = firstEvent.seq.length * ratio;

        var secondEvent  = PatternFactory.generateEmptyAudioEvent();
        secondEvent.note = "C#";
        secondEvent.seq.startMeasureOffset = 5;
        secondEvent.seq.length             = 1.5;

        var expectedOffset2 = secondEvent.seq.startMeasureOffset * ratio;
        var expectedLength2 = secondEvent.seq.length * ratio;

        song.patterns[ 0 ].channels[ 0 ][ 0 ] = firstEvent;
        song.patterns[ 1 ].channels[ 1 ][ 8 ] = secondEvent;

        SongUtil.updateEventOffsets( song.patterns, ratio );

        // asset results

        assert.strictEqual( expectedOffset1, firstEvent.seq.startMeasureOffset,
            "expect event startMeasureOffset to have updated" );

        assert.strictEqual( expectedLength1, firstEvent.seq.length,
            "expect event length to have updated" );

        assert.strictEqual( expectedOffset2, secondEvent.seq.startMeasureOffset,
            "expect event startMeasureOffset to have updated" );

        assert.strictEqual( expectedLength2, secondEvent.seq.length,
            "expect event length to have updated" );
    });
});
