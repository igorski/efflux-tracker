/**
 * Created by igorzinken on 26-07-15.
 */
var chai           = require( "chai" );
var EventUtil      = require( "../../src/js/utils/EventUtil" );
var MockBrowser    = require( "mock-browser" ).mocks.MockBrowser;
var PatternFactory = require( "../../src/js/factory/PatternFactory" );
var SongModel      = require( "../../src/js/model/SongModel" );

describe( "EventUtil", function()
{
    /* setup */

    // use Chai assertion library
    var assert = chai.assert,
        expect = chai.expect;

    // executed before the tests start running

    before( function()
    {
        var browser   = new MockBrowser();
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

    it( "should be able to update the position of a AudioEvent", function()
    {
        var model       = new SongModel();
        var song        = model.createSong();
        var pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        var expectedStartMeasure       = 0;
        var expectedStartMeasureOffset = 1; // half in measure (measure lasts 2s at 120 BPM)
        var expectedEndMeasure         = 0;
        var expectedLength             = .5;

        var audioEvent = PatternFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 2, expectedLength, song.meta.tempo );

        assert.strictEqual( expectedStartMeasure, audioEvent.seq.startMeasure,
            "expected event to start at measure " + expectedStartMeasure );

        assert.strictEqual( expectedStartMeasureOffset, audioEvent.seq.startMeasureOffset,
            "expected events measure offset to be at offset" + expectedStartMeasureOffset );

        assert.strictEqual( expectedEndMeasure, audioEvent.seq.endMeasure,
            "expected event to end at measure " + expectedEndMeasure );

        assert.strictEqual( expectedLength, audioEvent.seq.length,
            "expected event duration to be " + expectedLength + " seconds" );
    });

    it( "should be able to update the position of a AudioEvent that spans several measures in duration", function()
    {
        var model       = new SongModel();
        var song        = model.createSong();
        var pattern     = song.patterns[ 0 ];
        song.meta.tempo = 120;

        var expectedStartMeasure       = 0;
        var expectedStartMeasureOffset = .5; // a quarter note into measure (measure lasts 2s at 120 BPM)
        var expectedLength             = 4;  // duration is 4 seconds (2 measures at 120 BPM)
        var expectedEndMeasure         = 2;  // events duration exceeds 2 measures (each at 2s at 120 BPM)

        var audioEvent = PatternFactory.createAudioEvent();

        EventUtil.setPosition( audioEvent, pattern, 0, pattern.steps / 4, expectedLength, song.meta.tempo );

        assert.strictEqual( expectedStartMeasure, audioEvent.seq.startMeasure,
            "expected event to start at measure " + expectedStartMeasure );

        assert.strictEqual( expectedStartMeasureOffset, audioEvent.seq.startMeasureOffset,
            "expected events measure offset to be at offset" + expectedStartMeasureOffset );

        assert.strictEqual( expectedEndMeasure, audioEvent.seq.endMeasure,
            "expected event to end at measure " + expectedEndMeasure );

        assert.strictEqual( expectedLength, audioEvent.seq.length,
            "expected event duration to be " + expectedLength + " seconds" );
    });
});
